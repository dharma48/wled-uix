/**
 * WebSocket proxy between browser clients and a WLED device's `/ws` endpoint.
 *
 * WLED allows at most 4 WS clients per device and only ONE live "peek" stream. We keep a
 * SINGLE upstream connection per device and fan its frames out to all attached browsers:
 *  - state frames (`{"v":true}` responses) go to every client;
 *  - live-peek frames (`{"lv":true}` stream) go only to clients that asked for peek.
 * Because the proxy is the device's single peek client, multiple browsers can preview at
 * once without hitting WLED's one-peek limit. Peek is requested upstream only while ≥1
 * browser wants it, and stopped when demand drops to zero.
 *
 * For the mock device there is no real socket — we synthesize both state and live frames.
 *
 * This module is transport-agnostic: it is driven from both the dev Vite plugin and the
 * production custom server, which each perform the HTTP upgrade and hand us a `ws` socket.
 */
import { WebSocket } from 'ws';
import { getDevice } from './deviceStore';
import { mockLiveFrame, mockStateSnapshot } from './mockDevice';
import { isLiveFrameText } from '../wled/live';

const LIVE_MAGIC = 0x4c; // 'L' — first byte of WLED's binary peek packet

type Client = WebSocket;

interface Upstream {
	socket: WebSocket | null;
	clients: Set<Client>;
	/** Subset of clients currently requesting the live-peek stream. */
	liveClients: Set<Client>;
	/** Whether we've told the upstream device to stream live frames. */
	peeking: boolean;
	reconnectTimer: ReturnType<typeof setTimeout> | null;
	closing: boolean;
}

const upstreams = new Map<string, Upstream>();

/** Parse `/api/devices/<id>/ws` -> id. Returns null for non-matching paths. */
export function parseDeviceWsPath(pathname: string): string | null {
	const m = pathname.match(/^\/api\/devices\/([^/]+)\/ws\/?$/);
	return m ? decodeURIComponent(m[1]) : null;
}

function send(client: Client, data: unknown) {
	if (client.readyState !== WebSocket.OPEN) return;
	if (typeof data === 'string' || Buffer.isBuffer(data) || ArrayBuffer.isView(data)) {
		client.send(data as string | Buffer);
	} else {
		client.send(JSON.stringify(data));
	}
}

/** Read a client's live-peek intent from a message, or null if it isn't an lv toggle. */
function lvIntent(text: string): boolean | null {
	try {
		const msg = JSON.parse(text);
		return typeof msg?.lv === 'boolean' ? msg.lv : null;
	} catch {
		return null;
	}
}

/** Attach a freshly-upgraded browser socket to the given device. */
export function handleDeviceSocket(deviceId: string, client: Client): void {
	const device = getDevice(deviceId);
	if (!device) {
		send(client, { error: 'unknown device' });
		client.close();
		return;
	}

	if (device.host === 'mock') {
		attachMock(client);
		return;
	}

	attachReal(deviceId, device.host, client);
}

// ---- Mock device: emulate state pushes + live frames --------------------------------

function attachMock(client: Client) {
	send(client, { ...mockStateSnapshot() });
	let lastSerialized = JSON.stringify(mockStateSnapshot());

	const stateInterval = setInterval(() => {
		const snap = JSON.stringify(mockStateSnapshot());
		if (snap !== lastSerialized) {
			lastSerialized = snap;
			send(client, snap);
		}
	}, 500);

	let liveInterval: ReturnType<typeof setInterval> | null = null;
	const startLive = () => {
		if (liveInterval) return;
		liveInterval = setInterval(() => send(client, mockLiveFrame()), 50); // ~20fps
	};
	const stopLive = () => {
		if (liveInterval) {
			clearInterval(liveInterval);
			liveInterval = null;
		}
	};

	client.on('message', (raw) => {
		const text = raw.toString();
		const lv = lvIntent(text);
		if (lv !== null) {
			lv ? startLive() : stopLive();
			return;
		}
		try {
			if (JSON.parse(text)?.v) send(client, { ...mockStateSnapshot() });
		} catch {
			/* ignore malformed client message */
		}
	});
	const cleanup = () => {
		clearInterval(stateInterval);
		stopLive();
	};
	client.on('close', cleanup);
	client.on('error', cleanup);
}

// ---- Real device: single shared upstream, fanned out ------------------------------

function attachReal(deviceId: string, host: string, client: Client) {
	let up = upstreams.get(deviceId);
	if (!up) {
		up = {
			socket: null,
			clients: new Set(),
			liveClients: new Set(),
			peeking: false,
			reconnectTimer: null,
			closing: false
		};
		upstreams.set(deviceId, up);
	}
	up.clients.add(client);
	ensureUpstream(deviceId, host, up);

	client.on('message', (raw) => {
		const text = raw.toString();
		const lv = lvIntent(text);
		if (lv !== null) {
			// Manage peek demand at the aggregate; don't forward per-client lv toggles.
			if (lv) up.liveClients.add(client);
			else up.liveClients.delete(client);
			syncPeek(up);
			return;
		}
		if (up.socket?.readyState === WebSocket.OPEN) up.socket.send(text);
	});
	client.on('close', () => detachReal(deviceId, client));
	client.on('error', () => detachReal(deviceId, client));
}

/** Bring the upstream peek stream in line with current demand. */
function syncPeek(up: Upstream) {
	const shouldPeek = up.liveClients.size > 0;
	if (shouldPeek === up.peeking) return;
	up.peeking = shouldPeek;
	if (up.socket?.readyState === WebSocket.OPEN) {
		up.socket.send(JSON.stringify({ lv: shouldPeek }));
	}
}

function ensureUpstream(deviceId: string, host: string, up: Upstream) {
	if (
		up.socket &&
		(up.socket.readyState === WebSocket.OPEN || up.socket.readyState === WebSocket.CONNECTING)
	)
		return;

	const socket = new WebSocket(`ws://${host}/ws`);
	up.socket = socket;

	socket.on('open', () => {
		// Ask WLED to push full state now and on change; re-arm peek if a client wants it
		// (a fresh connection resets the device's peek state).
		socket.send(JSON.stringify({ v: true }));
		up.peeking = false;
		if (up.liveClients.size > 0) syncPeek(up);
	});
	socket.on('message', (raw, isBinary) => {
		if (isBinary) {
			// Binary 'L' packet = live peek: forward verbatim (bytes intact) to peekers.
			const buf = raw as Buffer;
			const targets = buf.length > 0 && buf[0] === LIVE_MAGIC ? up.liveClients : up.clients;
			for (const client of targets) send(client, buf);
			return;
		}
		// Text: state pushes to everyone; legacy JSON live frames only to peekers.
		const text = raw.toString();
		const targets = isLiveFrameText(text) ? up.liveClients : up.clients;
		for (const client of targets) send(client, text);
	});
	const scheduleReconnect = () => {
		up.socket = null;
		up.peeking = false;
		if (up.closing || up.clients.size === 0) return;
		if (up.reconnectTimer) return;
		up.reconnectTimer = setTimeout(() => {
			up.reconnectTimer = null;
			ensureUpstream(deviceId, host, up);
		}, 2000);
	};
	socket.on('close', scheduleReconnect);
	socket.on('error', () => {
		for (const client of up.clients) send(client, { error: 'device unreachable' });
		try {
			socket.close();
		} catch {
			/* ignore */
		}
	});
}

function detachReal(deviceId: string, client: Client) {
	const up = upstreams.get(deviceId);
	if (!up) return;
	up.clients.delete(client);
	up.liveClients.delete(client);
	syncPeek(up);
	if (up.clients.size === 0) {
		up.closing = true;
		if (up.reconnectTimer) clearTimeout(up.reconnectTimer);
		try {
			up.socket?.close();
		} catch {
			/* ignore */
		}
		upstreams.delete(deviceId);
	}
}

// Bridge for the production custom server (server.js), which cannot import bundled
// app modules directly. hooks.server.ts imports this module so the bridge is registered
// at server startup; the dev Vite plugin imports handleDeviceSocket directly instead.
(globalThis as unknown as { __wledWs?: unknown }).__wledWs = {
	handleDeviceSocket,
	parseDeviceWsPath
};
