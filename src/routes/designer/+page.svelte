<script lang="ts">
	import { devices } from '$lib/stores/devices.svelte';
	import { activeController } from '$lib/stores/activeController.svelte';
	import { scenes } from '$lib/stores/scenes.svelte';
	import ConnectionBadge from '$lib/components/ConnectionBadge.svelte';
	import StripCanvas from '$lib/components/StripCanvas.svelte';
	import SegmentGeometryBar from '$lib/components/SegmentGeometryBar.svelte';
	import SegmentEditor from '$lib/components/SegmentEditor.svelte';

	let ctrl = $derived(activeController.controller);
	let savedMsg = $state(false);

	async function saveAsScene() {
		const c = ctrl;
		const id = devices.active?.id;
		if (!c || !id) return;
		const name = `Scene ${new Date().toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
		await scenes.create(id, name, c.captureState(), c.ledCount);
		savedMsg = true;
		setTimeout(() => (savedMsg = false), 2200);
	}

	// Start the live peek while the designer is open; stop it on leave / device switch so
	// the device's single peek slot is freed.
	$effect(() => {
		const c = ctrl;
		if (!c) return;
		c.startPeek();
		return () => c.stopPeek();
	});
</script>

<svelte:head><title>WLED UIX — Designer</title></svelte:head>

{#if !devices.loaded}
	<div class="state-msg">Loading…</div>
{:else if !ctrl}
	<div class="state-msg card">
		<h2>No device yet</h2>
		<p class="faint">Add a WLED controller from the selector in the top bar to start designing.</p>
	</div>
{:else if ctrl.loading}
	<div class="state-msg">Connecting to {devices.active?.name}…</div>
{:else if ctrl.error && !ctrl.bundle}
	<div class="state-msg card error">
		<h2>Can't reach this device</h2>
		<p class="faint">{ctrl.error}</p>
		<button class="btn btn-primary" onclick={() => ctrl?.init()}>Retry</button>
	</div>
{:else if ctrl.bundle}
	<div class="designer">
		<section class="strip-card card">
			<header class="strip-head">
				<div>
					<h2>Scene Designer</h2>
					<span class="faint">Drag segment edges to resize, drag the body to move.</span>
				</div>
				<div class="head-right">
					<button class="save-scene" class:saved={savedMsg} onclick={saveAsScene}>
						{savedMsg ? 'Saved to Scenes ✓' : 'Save as scene'}
					</button>
					<button
						class="peek-toggle"
						class:on={ctrl.peeking}
						onclick={() => (ctrl!.peeking ? ctrl!.stopPeek() : ctrl!.startPeek())}
						title="Toggle live LED preview"
					>
						<span class="dot"></span>
						{ctrl.peeking ? 'Live preview on' : 'Live preview off'}
					</button>
					<ConnectionBadge {ctrl} />
				</div>
			</header>

			<StripCanvas {ctrl} />
			<SegmentGeometryBar {ctrl} />
		</section>

		<SegmentEditor {ctrl} />
	</div>
{/if}

<style>
	.state-msg {
		text-align: center;
		color: var(--text-dim);
		padding: 48px 24px;
		margin-top: 40px;
	}
	.state-msg.card {
		max-width: 460px;
		margin: 60px auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}
	.state-msg.error {
		border-color: color-mix(in srgb, var(--danger) 40%, var(--border));
	}
	.designer {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.strip-card {
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.strip-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.strip-head h2 {
		font-size: 1.1rem;
	}
	.strip-head .faint {
		font-size: 0.82rem;
	}
	.head-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.save-scene {
		padding: 7px 16px;
		border-radius: 999px;
		border: 1px solid transparent;
		background: var(--accent);
		color: var(--accent-contrast);
		font-size: 0.82rem;
		font-weight: 650;
		transition: all 0.15s var(--ease);
	}
	.save-scene:hover {
		background: var(--accent-hover);
	}
	.save-scene.saved {
		background: color-mix(in srgb, var(--ok) 22%, transparent);
		border-color: color-mix(in srgb, var(--ok) 55%, transparent);
		color: var(--ok);
	}
	.peek-toggle {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 14px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		color: var(--text-dim);
		font-size: 0.82rem;
		font-weight: 600;
		transition: all 0.15s var(--ease);
	}
	.peek-toggle .dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--text-faint);
	}
	.peek-toggle.on {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 50%, transparent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.peek-toggle.on .dot {
		background: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
		animation: livepulse 1.4s ease-in-out infinite;
	}
	@keyframes livepulse {
		50% {
			opacity: 0.4;
		}
	}
</style>
