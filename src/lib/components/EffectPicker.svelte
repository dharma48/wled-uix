<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';

	let { ctrl }: { ctrl: DeviceController } = $props();

	let seg = $derived(ctrl.selectedSegment);
	let effects = $derived(ctrl.bundle?.effects ?? []);
	let query = $state('');

	let filtered = $derived(
		effects
			.map((name, id) => ({ name, id, meta: ctrl.metaFor(id) }))
			.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
	);
</script>

{#if seg}
	<div class="effect-picker">
		<input class="search" placeholder="Search effects…" bind:value={query} />
		<div class="list">
			{#each filtered as e (e.id)}
				<button
					class="fx"
					class:active={seg.fx === e.id}
					onclick={() => ctrl.setSegEffect(e.id)}
				>
					<span class="fx-name">{e.name}</span>
					<span class="tags">
						{#if e.meta?.is2D}<span class="tag two-d" title="2D matrix">2D</span>{/if}
						{#if e.meta?.volumeReactive}<span class="tag audio" title="Volume reactive">♪</span>{/if}
						{#if e.meta?.frequencyReactive}<span class="tag audio" title="Frequency reactive">≈</span>{/if}
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
	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 6px;
		max-height: 300px;
		overflow-y: auto;
		padding-right: 4px;
	}
	.fx {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 12px;
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
	.fx-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tags {
		display: inline-flex;
		gap: 4px;
	}
	.tag {
		font-size: 0.68rem;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: 5px;
		background: color-mix(in srgb, currentColor 18%, transparent);
	}
</style>
