/**
 * Shared server-side logger (pino + pino-pretty).
 *
 * Lives at the repo root — NOT under src/ — because it must be importable by both:
 *  - the bundled SvelteKit app code (via a relative import, e.g. `../../../logger.js`), and
 *  - the production custom server (server.js), a plain Node ESM entry that runs against
 *    ./build and never sees src/ in the Docker image.
 *
 * A relative import (rather than a Kit `$logger` alias) is deliberate: vite.config.ts
 * eagerly imports the server module graph (via the dev WS-proxy plugin), so a Kit alias
 * isn't resolvable when Vite loads its own config.
 *
 * `pino` / `pino-pretty` are declared in package.json `dependencies`, so SvelteKit's SSR
 * build externalizes them (they stay in node_modules rather than being bundled). This is
 * what lets pino's pretty transport worker resolve correctly at runtime.
 *
 * Level is controlled by the LOG_LEVEL env var (default "info"); unknown values fall back
 * to "info" so a typo never crashes the server.
 */
import pino from 'pino';

const LEVELS = new Set(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']);

/** Resolve LOG_LEVEL to a valid pino level, defaulting to "info". */
function resolveLevel() {
	const raw = (process.env.LOG_LEVEL ?? '').trim().toLowerCase();
	return LEVELS.has(raw) ? raw : 'info';
}

const base = pino({
	level: resolveLevel(),
	transport: {
		target: 'pino-pretty',
		options: {
			colorize: true,
			translateTime: 'SYS:standard',
			ignore: 'pid,hostname,module',
			messageFormat: '[{module}] {msg}'
		}
	}
});

/**
 * Base logger without a module tag. Prefer `createLogger('name')` in most modules so lines
 * are prefixed with their source.
 */
export const logger = base;

/**
 * A child logger tagged with a module name, rendered as `[name]` in each line.
 * @param {string} module
 */
export function createLogger(module) {
	return base.child({ module });
}
