<script lang="ts">
	import { browser } from '$app/environment';
	import type { DeviceController } from '$lib/stores/device.svelte';

	let { ctrl }: { ctrl: DeviceController } = $props();

	interface PresetItem {
		id: number;
		name: string;
	}
	let presets = $state<PresetItem[]>([]);
	let loaded = $state(false);

	$effect(() => {
		const id = ctrl.id;
		if (!browser) return;
		loaded = false;
		fetch(`/api/devices/${encodeURIComponent(id)}/presets`)
			.then((r) => r.json())
			.then((data: Record<string, { n?: string }>) => {
				presets = Object.entries(data)
					.filter(([pid, p]) => pid !== '0' && p && p.n)
					.map(([pid, p]) => ({ id: Number(pid), name: p.n as string }))
					.sort((a, b) => a.id - b.id);
			})
			.catch(() => (presets = []))
			.finally(() => (loaded = true));
	});

	let activePs = $derived(ctrl.state?.ps ?? -1);
</script>

{#if presets.length}
	<div class="preset-bar">
		<span class="label faint">Presets</span>
		<div class="chips">
			{#each presets as p (p.id)}
				<button
					class="chip"
					class:active={activePs === p.id}
					onclick={() => ctrl.applyPreset(p.id)}
				>
					{p.name}
				</button>
			{/each}
		</div>
	</div>
{:else if loaded}
	<div class="preset-bar">
		<span class="faint empty">No presets saved on this device yet.</span>
	</div>
{/if}

<style>
	.preset-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.chip {
		padding: 8px 16px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		font-size: 0.86rem;
		font-weight: 550;
		color: var(--text-dim);
		transition: all 0.14s var(--ease);
	}
	.chip:hover {
		color: var(--text);
		border-color: var(--border-strong);
	}
	.chip.active {
		background: var(--accent);
		color: var(--accent-contrast);
		border-color: transparent;
	}
	.empty {
		font-size: 0.85rem;
	}
</style>
