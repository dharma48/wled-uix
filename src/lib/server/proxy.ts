/**
 * Server-side HTTP proxy to a WLED device. Resolves a device id to its host and
 * forwards /json (and /presets.json) requests. Devices whose host is "mock" are served
 * by the in-process fake. This is the layer that removes CORS / mixed-content problems:
 * the browser only ever talks to our own origin.
 *
 * Two device-hardening measures live here:
 *  1. Requests to a given device are SERIALIZED (one in-flight at a time) to keep load on
 *     the small MCU low and keep retries orderly.
 *  2. GET responses are VALIDATED as JSON and RETRIED on failure. WLED intermittently
 *     truncates large JSON responses (e.g. /json/fxdata cut off mid-array under memory
 *     pressure), which surfaced as "Expected ',' or ']' ..." parse errors in the browser.
 *     A couple of retries turns a ~10% truncation rate into effectively zero.
 */
import { getDevice } from './deviceStore';
import { mockJson, mockPresets } from './mockDevice';
import { createSerialQueue } from './serialQueue';

const REQUEST_TIMEOUT_MS = 4000;
const GET_RETRIES = 3; // total attempts for a GET before giving up
const RETRY_DELAY_MS = 120;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function passthrough(text: string, status: number): Response {
	return new Response(text, { status, headers: { 'content-type': 'application/json' } });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One in-flight HTTP request per device (keyed by device id). See file header.
const serialize = createSerialQueue<string>();

/** A single upstream round-trip. Throws on network error / timeout. */
async function upstreamOnce(
	url: string,
	method: string,
	body: Record<string, unknown> | undefined
): Promise<{ status: number; text: string }> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			method,
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: method === 'POST' && body ? JSON.stringify(body) : undefined,
			signal: controller.signal
		});
		return { status: res.status, text: await res.text() };
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Serialized upstream request. GET responses are validated as JSON and retried on
 * truncation; network errors are NOT retried (a dead device shouldn't cost 3× the
 * timeout). POST is sent once.
 */
function fetchDevice(
	deviceId: string,
	url: string,
	method: string,
	body: Record<string, unknown> | undefined,
	host: string
): Promise<Response> {
	return serialize(deviceId, async () => {
		const attempts = method === 'GET' ? GET_RETRIES : 1;
		let truncatedBytes = -1;
		for (let attempt = 0; attempt < attempts; attempt++) {
			let up: { status: number; text: string };
			try {
				up = await upstreamOnce(url, method, body);
			} catch (err) {
				return json({ error: 'device unreachable', detail: (err as Error).message, host }, 502);
			}
			// Don't try to parse error bodies or POST acks — pass them straight through.
			if (method !== 'GET' || up.status >= 400) return passthrough(up.text, up.status);
			try {
				JSON.parse(up.text);
				return passthrough(up.text, up.status);
			} catch {
				truncatedBytes = up.text.length; // device truncated the response — retry
				if (attempt < attempts - 1) await delay(RETRY_DELAY_MS);
			}
		}
		return json(
			{ error: 'device returned malformed JSON', bytes: truncatedBytes, host, attempts },
			502
		);
	});
}

/** Proxy a `/json[/subpath]` request. `subpath` is the part after `/json`. */
export async function proxyJson(
	deviceId: string,
	subpath: string,
	method: string,
	body: Record<string, unknown> | undefined
): Promise<Response> {
	const device = getDevice(deviceId);
	if (!device) return json({ error: 'unknown device' }, 404);

	if (device.host === 'mock') {
		const res = mockJson(method, subpath, body);
		return json(res.body, res.status);
	}

	const url = `http://${device.host}/json${subpath ? `/${subpath.replace(/^\/+/, '')}` : ''}`;
	return fetchDevice(deviceId, url, method, body, device.host);
}

/** Proxy `GET /presets.json`. */
export async function proxyPresets(deviceId: string): Promise<Response> {
	const device = getDevice(deviceId);
	if (!device) return json({ error: 'unknown device' }, 404);

	if (device.host === 'mock') {
		const res = mockPresets();
		return json(res.body, res.status);
	}

	return fetchDevice(deviceId, `http://${device.host}/presets.json`, 'GET', undefined, device.host);
}
