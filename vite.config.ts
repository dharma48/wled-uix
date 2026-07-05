import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { devWsProxy } from './src/lib/server/devWsProxy';

export default defineConfig({
	plugins: [sveltekit(), devWsProxy()]
});
