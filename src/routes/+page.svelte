<script lang="ts">
	import { devices } from '$lib/stores/devices.svelte';
	import { activeController } from '$lib/stores/activeController.svelte';
	import PowerToggle from '$lib/components/PowerToggle.svelte';
	import ConnectionBadge from '$lib/components/ConnectionBadge.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import SegmentList from '$lib/components/SegmentList.svelte';
	import SegmentEditor from '$lib/components/SegmentEditor.svelte';
	import PresetBar from '$lib/components/PresetBar.svelte';

	let ctrl = $derived(activeController.controller);
</script>

<svelte:head><title>WLED UIX</title></svelte:head>

{#if !devices.loaded}
	<div class="state-msg">Loading…</div>
{:else if !ctrl}
	<div class="state-msg card">
		<h2>No device yet</h2>
		<p class="faint">Add a WLED controller from the selector in the top bar to get started.</p>
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
	<div class="dashboard">
		<section class="master card">
			<div class="master-top">
				<PowerToggle {ctrl} />
				<ConnectionBadge {ctrl} />
			</div>
			<Slider
				label="Brightness"
				value={ctrl.state?.bri ?? 0}
				min={1}
				max={255}
				showValue
				fill="linear-gradient(90deg, #4a4a4a, #fff2c4)"
				oninput={(v) => ctrl?.setBrightness(v)}
			/>
			<PresetBar {ctrl} />
		</section>

		<div class="grid">
			<aside class="segments card">
				<h3 class="section-title">Segments</h3>
				<SegmentList {ctrl} />
			</aside>
			<div class="editor-wrap">
				<SegmentEditor {ctrl} />
			</div>
		</div>
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
	.state-msg h2 {
		font-size: 1.2rem;
	}
	.state-msg.error {
		border-color: color-mix(in srgb, var(--danger) 40%, var(--border));
	}
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.master {
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.master-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.grid {
		display: grid;
		grid-template-columns: minmax(240px, 320px) 1fr;
		gap: 16px;
		align-items: start;
	}
	.segments {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.section-title {
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-dim);
	}
	@media (max-width: 780px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
