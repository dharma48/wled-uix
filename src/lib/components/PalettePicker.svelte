<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	import { paletteGradient } from '$lib/wled/palettes';
	import type { WledColor } from '$lib/wled/types';

	let { ctrl }: { ctrl: DeviceController } = $props();

	let seg = $derived(ctrl.selectedSegment);
	let palettes = $derived(ctrl.bundle?.palettes ?? []);
	let segColors = $derived((seg?.col ?? []) as WledColor[]);
	let query = $state('');

	let filtered = $derived(
		palettes
			.map((name, id) => ({ name, id }))
			.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
	);
</script>

{#if seg}
	<div class="palette-picker">
		<input class="search" placeholder="Search palettes…" bind:value={query} />
		<div class="grid">
			{#each filtered as p (p.id)}
				<button
					class="pal"
					class:active={seg.pal === p.id}
					onclick={() => ctrl.setSegPalette(p.id)}
					title={p.name}
				>
					<span class="bar" style:background={paletteGradient(p.name, segColors)}></span>
					<span class="name">{p.name}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.palette-picker {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.search {
		width: 100%;
		padding: 9px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		font-size: 0.9rem;
	}
	.search:focus {
		outline: none;
		border-color: var(--accent);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 8px;
		max-height: 320px;
		overflow-y: auto;
		padding-right: 4px;
	}
	.pal {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		text-align: left;
	}
	.pal.active {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
	}
	.bar {
		height: 26px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}
	.name {
		font-size: 0.78rem;
		color: var(--text-dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pal.active .name {
		color: var(--text);
	}
</style>
