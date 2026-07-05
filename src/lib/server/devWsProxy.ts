/**
 * Vite dev-server plugin: proxies WebSocket upgrades on `/api/devices/<id>/ws` to the
 * device WS proxy. In production this same routing is done by the custom server (server.js).
 * Non-matching upgrades (e.g. Vite HMR) are left untouched.
 */
import type { Plugin } from 'vite';
import { WebSocketServer } from 'ws';
import { handleDeviceSocket, parseDeviceWsPath } from './wsProxy';

export function devWsProxy(): Plugin {
	return {
		name: 'wled-dev-ws-proxy',
		configureServer(server) {
			const wss = new WebSocketServer({ noServer: true });
			server.httpServer?.on('upgrade', (req, socket, head) => {
				const pathname = new URL(req.url ?? '', 'http://localhost').pathname;
				const id = parseDeviceWsPath(pathname);
				if (!id) return; // not ours — let Vite's HMR handle it
				wss.handleUpgrade(req, socket, head, (ws) => handleDeviceSocket(id, ws));
			});
		}
	};
}
