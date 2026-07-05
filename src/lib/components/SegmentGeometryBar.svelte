<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';

	let { ctrl }: { ctrl: DeviceController } = $props();

	let seg = $derived(ctrl.selectedSegment);
	let count = $derived(ctrl.ledCount);

	function setStart(v: number) {
		if (seg) ctrl.resizeSegment(seg.id, v, seg.stop, true);
	}
	function setStop(v: number) {
		if (seg) ctrl.resizeSegment(seg.id, seg.start, v, true);
	}
</script>

<div class="geo-bar">
	<div class="actions">
		<button
			class="btn"
			onclick={() => ctrl.addSegment()}
			disabled={!ctrl.canAddSegment}
			title={ctrl.canAddSegment ? 'Add a segment' : `Max ${ctrl.maxSeg} segments reached`}
		>
			+ Segment
		</button>
		<button
			class="btn danger"
			onclick={() => seg && ctrl.deleteSegment(seg.id)}
			disabled={!seg || ctrl.segments.length <= 1}
			title={ctrl.segments.length <= 1 ? 'Keep at least one segment' : 'Delete selected segment'}
		>
			Delete
		</button>
	</div>

	{#if seg}
		<div class="ranges">
			<label>
				<span class="faint">Start</span>
				<input
					type="number"
					min="0"
					max={count}
					value={seg.start}
					onchange={(e) => setStart(Number(e.currentTarget.value))}
				/>
			</label>
			<label>
				<span class="faint">Stop</span>
				<input
					type="number"
					min="0"
					max={count}
					value={seg.stop}
					onchange={(e) => setStop(Number(e.currentTarget.value))}
				/>
			</label>
			<span class="len faint">{seg.stop - seg.start} LEDs</span>
		</div>
	{/if}

	<span class="count faint">{ctrl.segments.length}/{ctrl.maxSeg} segments · {count} LEDs</span>
</div>

<style>
	.geo-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	.actions {
		display: flex;
		gap: 8px;
	}
	.btn.danger:hover:not(:disabled) {
		background: color-mix(in srgb, var(--danger) 20%, transparent);
		border-color: color-mix(in srgb, var(--danger) 50%, transparent);
		color: var(--danger);
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.ranges {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.ranges label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.82rem;
	}
	.ranges input {
		width: 68px;
		padding: 7px 9px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
	}
	.ranges input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.len {
		font-size: 0.8rem;
	}
	.count {
		font-size: 0.8rem;
		margin-left: auto;
	}
</style>
