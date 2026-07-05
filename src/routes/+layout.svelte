<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { devices } from '$lib/stores/devices.svelte';
	import { activeController } from '$lib/stores/activeController.svelte';
	import DeviceSwitcher from '$lib/components/DeviceSwitcher.svelte';

	let { children } = $props();
	let theme = $state<'dark' | 'light'>('dark');

	onMount(() => {
		devices.load();
		const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
		if (saved) applyTheme(saved);
	});

	// Keep the shared device controller in step with the active device, across all routes.
	$effect(() => activeController.sync());

	const nav = [
		{ href: '/', label: 'Control' },
		{ href: '/designer', label: 'Designer' }
	];

	function applyTheme(t: 'dark' | 'light') {
		theme = t;
		document.documentElement.dataset.theme = t;
		localStorage.setItem('theme', t);
	}
</script>

<div class="app">
	<header class="topbar">
		<div class="brand">
			<span class="logo" aria-hidden="true"></span>
			<span class="brand-name">WLED&thinsp;<b>UIX</b></span>
		</div>
		<div class="topbar-right">
			<DeviceSwitcher />
			<button
				class="theme-btn"
				title="Toggle theme"
				aria-label="Toggle theme"
				onclick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
			>
				{theme === 'dark' ? '☀' : '☾'}
			</button>
		</div>
	</header>

	<nav class="tabs-nav">
		<div class="tabs-seg">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class="tab-link"
					class:active={page.url.pathname === item.href}
					aria-current={page.url.pathname === item.href ? 'page' : undefined}
				>
					{item.label}
				</a>
			{/each}
		</div>
	</nav>

	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	.app {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 18px;
		padding-top: max(12px, env(safe-area-inset-top));
		background: color-mix(in srgb, var(--bg) 85%, transparent);
		backdrop-filter: blur(14px);
		border-bottom: 1px solid var(--border);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.logo {
		width: 24px;
		height: 24px;
		border-radius: 7px;
		background: conic-gradient(from 0deg, #ff0040, #ff8c00, #ffe600, #00d68f, #00c8ff, #7a5cff, #ff0040);
		box-shadow: 0 0 12px -2px color-mix(in srgb, var(--accent) 60%, transparent);
	}
	.brand-name {
		font-weight: 600;
		font-size: 1.02rem;
		letter-spacing: -0.01em;
	}
	.brand-name b {
		color: var(--accent);
		font-weight: 800;
	}
	.topbar-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.theme-btn {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--bg-elev);
		font-size: 1rem;
	}
	.tabs-nav {
		display: flex;
		justify-content: center;
		padding: 12px 18px 0;
	}
	.tabs-seg {
		display: inline-flex;
		gap: 4px;
		padding: 4px;
		background: var(--bg-elev-2);
		border: 1px solid var(--border);
		border-radius: 999px;
	}
	.tab-link {
		padding: 8px 22px;
		border-radius: 999px;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-dim);
		transition: all 0.14s var(--ease);
	}
	.tab-link:hover {
		color: var(--text);
	}
	.tab-link.active {
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-sm);
	}
	.content {
		flex: 1;
		width: 100%;
		max-width: 1080px;
		margin: 0 auto;
		padding: 18px;
		padding-bottom: max(18px, env(safe-area-inset-bottom));
	}
</style>
