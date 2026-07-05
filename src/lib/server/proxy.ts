/**
 * Server-side HTTP proxy to a WLED device. Resolves a device id to its host and
 * forwards /json (and /presets.json) requests. Devices whose host is "mock" are served
 * by the in-process fake. This is the layer that removes CORS / mixed-content problems:
 * the browser only ever talks to our own origin.
 */
import { getDevice } from './deviceStore';
import { mockJson, mockPresets } from './mockDevice';

const REQUEST_TIMEOUT_MS = 4000;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
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
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const upstream = await fetch(url, {
			method,
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: method === 'POST' && body ? JSON.stringify(body) : undefined,
			signal: controller.signal
		});
		const text = await upstream.text();
		return new Response(text, {
			status: upstream.status,
			headers: { 'content-type': 'application/json' }
		});
	} catch (err) {
		return json(
			{ error: 'device unreachable', detail: (err as Error).message, host: device.host },
			502
		);
	} finally {
		clearTimeout(timer);
	}
}

/** Proxy `GET /presets.json`. */
export async function proxyPresets(deviceId: string): Promise<Response> {
	const device = getDevice(deviceId);
	if (!device) return json({ error: 'unknown device' }, 404);

	if (device.host === 'mock') {
		const res = mockPresets();
		return json(res.body, res.status);
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const upstream = await fetch(`http://${device.host}/presets.json`, {
			signal: controller.signal
		});
		const text = await upstream.text();
		return new Response(text, {
			status: upstream.status,
			headers: { 'content-type': 'application/json' }
		});
	} catch (err) {
		return json({ error: 'device unreachable', detail: (err as Error).message }, 502);
	} finally {
		clearTimeout(timer);
	}
}
