<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	import { favorites } from '$lib/stores/favorites.svelte';
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
			// Pin favorites to the top; stable sort preserves order within each group.
			.sort(
				(a, b) =>
					Number(favorites.isFavorite('palette', b.name)) -
					Number(favorites.isFavorite('palette', a.name))
			)
	);
</script>

{#if seg}
	<div class="palette-picker">
		<input class="search" placeholder="Search palettes…" bind:value={query} />
		<div class="grid">
			{#each filtered as p (p.id)}
				{@const fav = favorites.isFavorite('palette', p.name)}
				<div class="pal-item">
					<button
						class="pal"
						class:active={seg.pal === p.id}
						onclick={() => ctrl.setSegPalette(p.id)}
						title={p.name}
					>
						<span class="bar" style:background={paletteGradient(p.name, segColors)}></span>
						<span class="name">{p.name}</span>
					</button>
					<button
						class="star"
						class:on={fav}
						aria-label={fav ? `Unfavorite ${p.name}` : `Favorite ${p.name}`}
						aria-pressed={fav}
						title={fav ? 'Unfavorite' : 'Favorite'}
						onclick={() => favorites.toggle('palette', p.name)}
					>
						{fav ? '★' : '☆'}
					</button>
				</div>
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
	.pal-item {
		position: relative;
	}
	.pal {
		display: flex;
		width: 100%;
		box-sizing: border-box;
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
	.star {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: color-mix(in srgb, var(--bg) 55%, transparent);
		color: #fff;
		font-size: 0.9rem;
		line-height: 1;
		opacity: 0.75;
		cursor: pointer;
		transition:
			color 0.14s var(--ease),
			opacity 0.14s var(--ease);
	}
	.star:hover {
		opacity: 1;
	}
	.star.on {
		opacity: 1;
		color: #ffd43b;
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
