<script lang="ts">
	interface Props {
		value: number;
		min?: number;
		max?: number;
		step?: number;
		label?: string;
		/** CSS background for the filled portion of the track. */
		fill?: string;
		showValue?: boolean;
		oninput?: (value: number) => void;
	}
	let {
		value = $bindable(0),
		min = 0,
		max = 255,
		step = 1,
		label = '',
		fill = 'var(--accent)',
		showValue = false,
		oninput
	}: Props = $props();

	let pct = $derived(((value - min) / (max - min)) * 100);

	function handle(e: Event) {
		const v = Number((e.currentTarget as HTMLInputElement).value);
		value = v;
		oninput?.(v);
	}
</script>

<label class="slider">
	{#if label}
		<span class="slider-label">
			<span>{label}</span>
			{#if showValue}<span class="slider-value">{value}</span>{/if}
		</span>
	{/if}
	<span
		class="track"
		style:--pct="{pct}%"
		style:--fill={fill}
	>
		<input type="range" {min} {max} {step} {value} oninput={handle} aria-label={label} />
	</span>
</label>

<style>
	.slider {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
	}
	.slider-label {
		display: flex;
		justify-content: space-between;
		font-size: 0.82rem;
		color: var(--text-dim);
		font-weight: 550;
	}
	.slider-value {
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.track {
		position: relative;
		display: block;
		height: 34px;
		border-radius: 999px;
		background: var(--bg-elev-2);
		border: 1px solid var(--border);
		overflow: hidden;
	}
	.track::before {
		content: '';
		position: absolute;
		inset: 0;
		width: var(--pct);
		background: var(--fill);
		transition: width 0.03s linear;
		pointer-events: none;
	}
	input[type='range'] {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		background: transparent;
	}
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #fff;
		border: 2px solid rgba(0, 0, 0, 0.25);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
		cursor: grab;
	}
	input[type='range']::-moz-range-thumb {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #fff;
		border: 2px solid rgba(0, 0, 0, 0.25);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
		cursor: grab;
	}
	input[type='range']:active::-webkit-slider-thumb {
		cursor: grabbing;
	}
</style>
