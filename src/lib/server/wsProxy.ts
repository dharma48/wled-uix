/**
 * WebSocket proxy between browser clients and a WLED device's `/ws` endpoint.
 *
 * WLED allows at most 4 WS clients per device and only one live "peek" stream, so we
 * keep a SINGLE upstream connection per device and fan its state pushes out to all
 * attached browsers. For the mock device there is no real socket — we synthesize state
 * pushes by watching the in-process snapshot.
 *
 * This module is transport-agnostic: it is driven from both the dev Vite plugin and the
 * production custom server, which each perform the HTTP upgrade and hand us a `ws` socket.
 */
import { WebSocket } from 'ws';
import { getDevice } from './deviceStore';
import { mockStateSnapshot } from './mockDevice';

type Client = WebSocket;

interface Upstream {
	socket: WebSocket | null;
	clients: Set<Client>;
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
	if (client.readyState === WebSocket.OPEN) {
		client.send(typeof data === 'string' ? data : JSON.stringify(data));
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

// ---- Mock device: emulate state pushes from the in-process snapshot ----------------

function attachMock(client: Client) {
	send(client, { ...mockStateSnapshot() });
	let lastSerialized = JSON.stringify(mockStateSnapshot());

	const interval = setInterval(() => {
		const snap = JSON.stringify(mockStateSnapshot());
		if (snap !== lastSerialized) {
			lastSerialized = snap;
			send(client, snap);
		}
	}, 500);

	client.on('message', (raw) => {
		try {
			const msg = JSON.parse(raw.toString());
			if (msg && msg.v) send(client, { ...mockStateSnapshot() });
		} catch {
			/* ignore malformed client message */
		}
	});
	client.on('close', () => clearInterval(interval));
	client.on('error', () => clearInterval(interval));
}

// ---- Real device: single shared upstream, fanned out ------------------------------

function attachReal(deviceId: string, host: string, client: Client) {
	let up = upstreams.get(deviceId);
	if (!up) {
		up = { socket: null, clients: new Set(), reconnectTimer: null, closing: false };
		upstreams.set(deviceId, up);
	}
	up.clients.add(client);
	ensureUpstream(deviceId, host, up);

	client.on('message', (raw) => {
		// Forward client requests (e.g. {"v":true}) upstream when connected.
		if (up.socket?.readyState === WebSocket.OPEN) up.socket.send(raw.toString());
	});
	client.on('close', () => detachReal(deviceId, client));
	client.on('error', () => detachReal(deviceId, client));
}

function ensureUpstream(deviceId: string, host: string, up: Upstream) {
	if (up.socket && (up.socket.readyState === WebSocket.OPEN || up.socket.readyState === WebSocket.CONNECTING))
		return;

	const socket = new WebSocket(`ws://${host}/ws`);
	up.socket = socket;

	socket.on('open', () => {
		// Ask WLED to push full state now and on subsequent changes.
		socket.send(JSON.stringify({ v: true }));
	});
	socket.on('message', (raw) => {
		const text = raw.toString();
		for (const client of up.clients) send(client, text);
	});
	const scheduleReconnect = () => {
		up.socket = null;
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
