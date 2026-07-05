/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// Minimal offline-shell service worker. Precaches the built app so the UI opens without
// a network round-trip; API calls (/api/*) always go to the network (live device state).
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `wled-uix-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== location.origin) return;
	// Never cache device/API traffic — it must be live.
	if (url.pathname.startsWith('/api/')) return;

	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
		return;
	}

	// Network-first for navigations, falling back to the cached shell.
	event.respondWith(fetch(request).catch(() => caches.match(request).then((c) => c ?? caches.match('/'))) as Promise<Response>);
});
