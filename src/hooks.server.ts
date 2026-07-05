// Side-effect import: registers the WebSocket proxy bridge on globalThis at server
// startup so the production custom server (server.js) can route `/ws` upgrades.
import '$lib/server/wsProxy';
