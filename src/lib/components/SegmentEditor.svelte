<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import EffectPicker from './EffectPicker.svelte';
	import EffectControls from './EffectControls.svelte';
	import PalettePicker from './PalettePicker.svelte';

	let { ctrl }: { ctrl: DeviceController } = $props();

	let seg = $derived(ctrl.selectedSegment);
	let meta = $derived(seg ? ctrl.metaFor(seg.fx) : undefined);
	let effectName = $derived(seg ? (ctrl.bundle?.effects[seg.fx] ?? '') : '');

	type Tab = 'color' | 'effect' | 'palette';
	let tab = $state<Tab>('color');

	let tabs = $derived<{ id: Tab; label: string }[]>([
		{ id: 'color', label: 'Color' },
		{ id: 'effect', label: 'Effect' },
		...(meta?.usesPalette ? [{ id: 'palette' as Tab, label: 'Palette' }] : [])
	]);

	// If the active tab becomes unavailable (effect without palette), fall back.
	$effect(() => {
		if (!tabs.some((t) => t.id === tab)) tab = 'color';
	});
</script>

{#if seg}
	<div class="editor card">
		<header class="editor-head">
			<div>
				<h3>Segment {seg.id}</h3>
				<span class="faint">{effectName} · LEDs {seg.start}–{seg.stop}</span>
			</div>
		</header>

		<div class="tabs" role="tablist">
			{#each tabs as t (t.id)}
				<button
					role="tab"
					aria-selected={tab === t.id}
					class="tab"
					class:active={tab === t.id}
					onclick={() => (tab = t.id)}
				>
					{t.label}
				</button>
			{/each}
		</div>

		<div class="tab-body">
			{#if tab === 'color'}
				<ColorPicker {ctrl} />
			{:else if tab === 'effect'}
				<div class="effect-tab">
					<EffectPicker {ctrl} />
					<EffectControls {ctrl} />
				</div>
			{:else if tab === 'palette'}
				<PalettePicker {ctrl} />
			{/if}
		</div>
	</div>
{:else}
	<div class="editor card empty">
		<p class="faint">No segments defined on this device.</p>
	</div>
{/if}

<style>
	.editor {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.editor-head h3 {
		font-size: 1.05rem;
	}
	.editor-head .faint {
		font-size: 0.8rem;
	}
	.tabs {
		display: flex;
		gap: 4px;
		padding: 4px;
		background: var(--bg-elev-2);
		border-radius: 999px;
		border: 1px solid var(--border);
		align-self: flex-start;
	}
	.tab {
		padding: 7px 18px;
		border-radius: 999px;
		font-size: 0.86rem;
		font-weight: 600;
		color: var(--text-dim);
		transition: all 0.14s var(--ease);
	}
	.tab.active {
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-sm);
	}
	.effect-tab {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.empty {
		align-items: center;
		text-align: center;
		padding: 40px;
	}
</style>
