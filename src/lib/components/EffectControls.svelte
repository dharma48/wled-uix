<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	import type { CheckboxKey, SliderKey } from '$lib/wled/fxdata';
	import Slider from './Slider.svelte';
	import EffectInfoCard from './EffectInfoCard.svelte';

	let { ctrl }: { ctrl: DeviceController } = $props();

	let seg = $derived(ctrl.selectedSegment);
	let meta = $derived(seg ? ctrl.metaFor(seg.fx) : undefined);
	let effectName = $derived(seg ? (ctrl.bundle?.effects?.[seg.fx] ?? '') : '');

	function sliderValue(key: SliderKey): number {
		return (seg?.[key] as number | undefined) ?? 128;
	}
	function checkValue(key: CheckboxKey): boolean {
		return Boolean(seg?.[key]);
	}
</script>

{#if seg && meta}
	<div class="controls">
		<EffectInfoCard name={effectName} {meta} showControls={false} />

		{#if meta.sliders.length}
			<div class="sliders">
				{#each meta.sliders as s (s.key)}
					<Slider
						label={s.label}
						value={sliderValue(s.key)}
						min={0}
						max={255}
						showValue
						oninput={(v) => ctrl.setSegSlider(s.key, v)}
					/>
				{/each}
			</div>
		{/if}

		{#if meta.checkboxes.length}
			<div class="checks">
				{#each meta.checkboxes as c (c.key)}
					<label class="check">
						<input
							type="checkbox"
							checked={checkValue(c.key)}
							onchange={(e) => ctrl.setSegCheckbox(c.key, e.currentTarget.checked)}
						/>
						<span class="track"><span class="knob"></span></span>
						<span>{c.label}</span>
					</label>
				{/each}
			</div>
		{/if}

		{#if !meta.sliders.length && !meta.checkboxes.length}
			<p class="faint none">This effect has no adjustable parameters.</p>
		{/if}
	</div>
{/if}

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.sliders {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		font-size: 0.88rem;
		font-weight: 550;
		cursor: pointer;
	}
	.check input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.check .track {
		width: 40px;
		height: 24px;
		border-radius: 999px;
		background: var(--bg-elev-2);
		border: 1px solid var(--border);
		position: relative;
		transition: background 0.15s var(--ease);
	}
	.check .knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--text-faint);
		transition: all 0.15s var(--ease);
	}
	.check input:checked + .track {
		background: color-mix(in srgb, var(--accent) 70%, transparent);
		border-color: transparent;
	}
	.check input:checked + .track .knob {
		left: 18px;
		background: #fff;
	}
	.none {
		margin: 0;
		font-size: 0.85rem;
	}
</style>
