import { defineConfig } from 'vitest/config';

// Standalone config for unit tests (pure TS: fxdata parser, throttle). Kept separate from
// vite.config.ts so the SvelteKit plugin isn't pulled into the test runtime.
export default defineConfig({
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node'
	}
});
