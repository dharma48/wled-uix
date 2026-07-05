<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	import { hexToRgb, rgbToHex, cssColor, luminance } from '$lib/wled/color';
	import { hasCapability, LC_CCT, type WledColor } from '$lib/wled/types';
	import Slider from './Slider.svelte';

	let { ctrl }: { ctrl: DeviceController } = $props();

	let seg = $derived(ctrl.selectedSegment);
	let meta = $derived(seg ? ctrl.metaFor(seg.fx) : undefined);
	// Color slots the current effect exposes; always allow at least the primary.
	let slots = $derived(
		meta && meta.colors.length ? meta.colors : [{ index: 0, label: 'Primary' }]
	);
	let lc = $derived(ctrl.bundle?.info.leds.lc);
	let showCct = $derived(hasCapability(lc, LC_CCT));

	const SWATCHES: WledColor[] = [
		[255, 255, 255], [255, 170, 90], [255, 0, 0], [255, 100, 0], [255, 220, 0],
		[0, 255, 0], [0, 200, 200], [0, 90, 255], [130, 0, 255], [255, 0, 150]
	];

	let activeSlot = $state(0);

	function colOf(index: number): WledColor {
		return (seg?.col[index] as WledColor) ?? [0, 0, 0];
	}
	function pick(index: number, c: WledColor) {
		ctrl.setSegColor(index, c);
	}
</script>

{#if seg}
	<div class="picker">
		{#if slots.length > 1}
			<div class="slot-tabs" role="tablist">
				{#each slots as slot (slot.index)}
					<button
						role="tab"
						aria-selected={activeSlot === slot.index}
						class="slot-tab"
						class:active={activeSlot === slot.index}
						onclick={() => (activeSlot = slot.index)}
					>
						<span class="slot-chip" style:background={cssColor(colOf(slot.index))}></span>
						{slot.label}
					</button>
				{/each}
			</div>
		{/if}

		<div class="main-row">
			<label
				class="current"
				style:background={cssColor(colOf(activeSlot))}
				style:color={luminance(colOf(activeSlot)) > 140 ? '#000' : '#fff'}
			>
				<input
					type="color"
					value={rgbToHex(colOf(activeSlot))}
					oninput={(e) => pick(activeSlot, hexToRgb(e.currentTarget.value))}
				/>
				<span>{rgbToHex(colOf(activeSlot)).toUpperCase()}</span>
			</label>

			<div class="swatches">
				{#each SWATCHES as sw (sw.join())}
					<button
						class="swatch"
						style:background={cssColor(sw)}
						title={rgbToHex(sw)}
						aria-label={`Set ${rgbToHex(sw)}`}
						onclick={() => pick(activeSlot, sw)}
					></button>
				{/each}
			</div>
		</div>

		{#if showCct}
			<Slider
				label="White temperature"
				value={seg.cct ?? 127}
				min={0}
				max={255}
				fill="linear-gradient(90deg, #ffb457, #fff, #bcd6ff)"
				oninput={(v) => ctrl.setSegCct(v)}
			/>
		{/if}
	</div>
{/if}

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.slot-tabs {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.slot-tab {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		color: var(--text-dim);
		font-size: 0.82rem;
		font-weight: 550;
	}
	.slot-tab.active {
		color: var(--text);
		border-color: var(--border-strong);
	}
	.slot-chip {
		width: 14px;
		height: 14px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	.main-row {
		display: flex;
		gap: 14px;
		align-items: stretch;
		flex-wrap: wrap;
	}
	.current {
		position: relative;
		display: flex;
		align-items: flex-end;
		min-width: 116px;
		height: 92px;
		border-radius: var(--radius-sm);
		padding: 10px;
		font-weight: 650;
		font-size: 0.85rem;
		cursor: pointer;
		border: 1px solid var(--border);
		flex: 1;
	}
	.current input[type='color'] {
		position: absolute;
		inset: 0;
		opacity: 0;
		width: 100%;
		height: 100%;
		cursor: pointer;
	}
	.swatches {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 8px;
		flex: 2;
		min-width: 180px;
	}
	.swatch {
		height: 40px;
		border-radius: 9px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		transition: transform 0.08s var(--ease);
	}
	.swatch:hover {
		transform: scale(1.06);
	}
	.swatch:active {
		transform: scale(0.94);
	}
</style>
