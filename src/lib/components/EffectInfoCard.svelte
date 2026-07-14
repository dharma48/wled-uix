<script lang="ts">
	import type { EffectMeta } from '$lib/wled/fxdata';
	import { descriptionFor } from '$lib/wled/effectDescriptions';

	// `showControls` lists the effect's slider/checkbox labels — useful when browsing
	// (the picker popover), redundant when the real controls render right below the card.
	let {
		name,
		meta,
		showControls = true
	}: { name: string; meta: EffectMeta | undefined; showControls?: boolean } = $props();

	let description = $derived(descriptionFor(name));
	let colorLabels = $derived(meta?.colors.map((c) => c.label) ?? []);
	let usesPalette = $derived(meta?.usesPalette ?? false);
	let controlLabels = $derived([
		...(meta?.sliders.map((s) => s.label) ?? []),
		...(meta?.checkboxes.map((c) => c.label) ?? [])
	]);
</script>

<div class="info-card">
	<div class="head">
		<span class="name">{name}</span>
		{#if meta}
			<span class="tags">
				{#if meta.is2D}<span class="tag" title="2D matrix">2D</span>{/if}
				{#if meta.volumeReactive}<span class="tag" title="Volume reactive">♪</span>{/if}
				{#if meta.frequencyReactive}<span class="tag" title="Frequency reactive">≈</span>{/if}
			</span>
		{/if}
	</div>

	{#if description}
		<p class="desc">{description}</p>
	{/if}

	<dl class="meta">
		<div class="row">
			<dt>Uses</dt>
			<dd>
				{#if colorLabels.length || usesPalette}
					{[...colorLabels, ...(usesPalette ? ['Palette'] : [])].join(' · ')}
				{:else}
					No color options
				{/if}
			</dd>
		</div>
		{#if showControls && controlLabels.length}
			<div class="row">
				<dt>Controls</dt>
				<dd>{controlLabels.join(' · ')}</dd>
			</div>
		{/if}
	</dl>
</div>

<style>
	.info-card {
		display: flex;
		flex-direction: column;
		gap: 7px;
		padding: 11px 13px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		color: var(--text);
		font-size: 0.82rem;
		line-height: 1.4;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.name {
		font-weight: 650;
		font-size: 0.9rem;
	}
	.tags {
		display: inline-flex;
		gap: 4px;
		flex-shrink: 0;
		color: var(--text-dim);
	}
	.tag {
		font-size: 0.68rem;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: 5px;
		background: color-mix(in srgb, currentColor 18%, transparent);
	}
	.desc {
		margin: 0;
		color: var(--text-dim);
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin: 0;
	}
	.row {
		display: flex;
		gap: 8px;
	}
	dt {
		flex-shrink: 0;
		width: 58px;
		color: var(--text-faint);
		font-size: 0.74rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding-top: 1px;
	}
	dd {
		margin: 0;
		color: var(--text-dim);
	}
</style>
