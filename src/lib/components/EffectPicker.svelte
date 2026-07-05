<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';

	let { ctrl }: { ctrl: DeviceController } = $props();

	let seg = $derived(ctrl.selectedSegment);
	let effects = $derived(ctrl.bundle?.effects ?? []);
	let query = $state('');

	let filtered = $derived(
		effects
			.map((name, id) => ({ name, id, meta: ctrl.metaFor(id) }))
			// Hide WLED's reserved/removed effect slots (named "RSVD").
			.filter((e) => e.name !== 'RSVD')
			.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
	);
</script>

{#if seg}
	<div class="effect-picker">
		<input class="search" placeholder="Search effects…" bind:value={query} />
		<p class="legend faint">
			<span class="cdot"></span><span class="cdot"></span> colors used
			<span class="sep">·</span>
			<span class="pal-chip"></span> palette
		</p>
		<div class="list">
			{#each filtered as e (e.id)}
				{@const colorCount = e.meta?.colors.length ?? 0}
				{@const usesPalette = e.meta?.usesPalette ?? false}
				<button class="fx" class:active={seg.fx === e.id} onclick={() => ctrl.setSegEffect(e.id)}>
					<span class="fx-head">
						<span class="fx-name">{e.name}</span>
						<span class="tags">
							{#if e.meta?.is2D}<span class="tag" title="2D matrix">2D</span>{/if}
							{#if e.meta?.volumeReactive}<span class="tag" title="Volume reactive">♪</span>{/if}
							{#if e.meta?.frequencyReactive}<span class="tag" title="Frequency reactive">≈</span>{/if}
						</span>
					</span>
					<span class="fx-meta">
						{#if colorCount > 0}
							<span class="m-colors" title={`Uses ${colorCount} color${colorCount > 1 ? 's' : ''}`}>
								{#each Array(colorCount) as _, i (i)}<i class="cdot"></i>{/each}
							</span>
						{/if}
						{#if usesPalette}
							<span class="pal-chip" title="Uses a palette"></span>
						{/if}
						{#if colorCount === 0 && !usesPalette}
							<span class="m-none" title="No color or palette options">no color options</span>
						{/if}
					</span>
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.effect-picker {
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
	.legend {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.74rem;
		margin: -2px 0 0;
	}
	.legend .sep {
		margin: 0 3px;
	}
	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 6px;
		max-height: 320px;
		overflow-y: auto;
		padding-right: 4px;
	}
	.fx {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 9px 11px;
		border-radius: 9px;
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		color: var(--text-dim);
		font-size: 0.86rem;
		font-weight: 550;
		text-align: left;
	}
	.fx.active {
		color: var(--accent-contrast);
		background: var(--accent);
		border-color: transparent;
	}
	.fx-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.fx-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tags {
		display: inline-flex;
		gap: 4px;
		flex-shrink: 0;
	}
	.tag {
		font-size: 0.68rem;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: 5px;
		background: color-mix(in srgb, currentColor 18%, transparent);
	}
	.fx-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 12px;
	}
	.m-colors {
		display: inline-flex;
		gap: 3px;
	}
	.cdot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
		opacity: 0.75;
		display: inline-block;
	}
	.pal-chip {
		width: 22px;
		height: 8px;
		border-radius: 3px;
		display: inline-block;
		background: linear-gradient(90deg, #ff0040, #ff8c00, #ffe600, #00d68f, #00c8ff, #7a5cff);
	}
	.m-none {
		font-size: 0.72rem;
		opacity: 0.6;
		font-weight: 500;
	}
</style>
