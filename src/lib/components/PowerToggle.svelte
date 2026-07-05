<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	let { ctrl }: { ctrl: DeviceController } = $props();
	let on = $derived(ctrl.state?.on ?? false);
</script>

<button
	class="power"
	class:on
	onclick={() => ctrl.togglePower()}
	aria-pressed={on}
	title={on ? 'Turn off' : 'Turn on'}
>
	<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
		<path
			d="M12 3v9"
			fill="none"
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
		/>
		<path
			d="M6.5 6.8a7 7 0 1 0 11 0"
			fill="none"
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
		/>
	</svg>
	<span>{on ? 'On' : 'Off'}</span>
</button>

<style>
	.power {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		border-radius: 999px;
		background: var(--bg-elev-2);
		border: 1px solid var(--border);
		color: var(--text-dim);
		font-weight: 600;
		transition: all 0.18s var(--ease);
	}
	.power.on {
		background: color-mix(in srgb, var(--accent) 22%, transparent);
		border-color: color-mix(in srgb, var(--accent) 55%, transparent);
		color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
	}
	.power:active {
		transform: scale(0.97);
	}
</style>
