/**
 * Production entry point. adapter-node emits a request `handler`, but SvelteKit's node
 * adapter does not proxy WebSocket upgrades — so we create the HTTP server ourselves,
 * mount the SvelteKit handler for normal requests, and route `/api/devices/<id>/ws`
 * upgrades to the device WS proxy.
 *
 * The proxy functions are exposed on globalThis by src/hooks.server.ts (which imports
 * src/lib/server/wsProxy). Loading ./build/handler.js pulls in the app graph, so the
 * bridge is registered before requests are served.
 */
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { handler } from './build/handler.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const server = createServer(handler);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
	const bridge = /** @type {any} */ (globalThis).__wledWs;
	const pathname = new URL(req.url ?? '', 'http://localhost').pathname;
	const id = bridge?.parseDeviceWsPath?.(pathname);
	if (!bridge || !id) {
		socket.destroy();
		return;
	}
	wss.handleUpgrade(req, socket, head, (ws) => bridge.handleDeviceSocket(id, ws));
});

server.listen(port, host, () => {
	console.log(`WLED UIX listening on http://${host}:${port}`);
});
