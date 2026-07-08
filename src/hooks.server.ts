// Side-effect import: registers the WebSocket proxy bridge on globalThis at server
// startup so the production custom server (server.js) can route `/ws` upgrades.
import '$lib/server/wsProxy';

import type { Handle, HandleServerError } from '@sveltejs/kit';
import { createLogger } from '../logger.js';

const log = createLogger('http');

/** Log each request at debug: `GET /api/... -> 200 (3ms)`. */
export const handle: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const response = await resolve(event);
	log.debug(
		`${event.request.method} ${event.url.pathname} -> ${response.status} (${Date.now() - start}ms)`
	);
	return response;
};

/**
 * Central catch-all for server errors. SvelteKit routes both genuine crashes AND expected
 * client errors (e.g. 404 for an unknown route) here, so we only log real server faults at
 * `error`; anything with a 4xx status is a client mistake and goes to `debug`.
 */
export const handleError: HandleServerError = ({ error, event }) => {
	const status = typeof (error as { status?: unknown })?.status === 'number'
		? (error as { status: number }).status
		: 500;
	const where = `${event.request.method} ${event.url.pathname}`;
	if (status >= 400 && status < 500) {
		log.debug(`${status} ${where}: ${(error as Error)?.message ?? error}`);
	} else {
		log.error({ err: error }, `unhandled error in ${where}`);
	}
};
