<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	import { cssColor, luminance } from '$lib/wled/color';
	import { paletteGradient } from '$lib/wled/palettes';
	import type { WledColor } from '$lib/wled/types';

	let { ctrl }: { ctrl: DeviceController } = $props();

	let count = $derived(Math.max(1, ctrl.ledCount));
	let segments = $derived(ctrl.segments);
	let palettes = $derived(ctrl.bundle?.palettes ?? []);
	let peeking = $derived(ctrl.peeking);

	let trackEl = $state<HTMLDivElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);

	// Redraw the live-peek layer whenever a new frame arrives.
	$effect(() => {
		const frame = ctrl.liveFrame;
		const cv = canvasEl;
		if (!cv) return;
		const ctx = cv.getContext('2d');
		if (!ctx) return;
		const rect = cv.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		cv.width = Math.max(1, Math.round(rect.width * dpr));
		cv.height = Math.max(1, Math.round(rect.height * dpr));
		ctx.clearRect(0, 0, cv.width, cv.height);
		if (!frame || frame.colors.length === 0) return;
		const w = cv.width / frame.colors.length;
		for (let i = 0; i < frame.colors.length; i++) {
			ctx.fillStyle = frame.colors[i];
			ctx.fillRect(Math.floor(i * w), 0, Math.ceil(w) + 1, cv.height);
		}
	});

	function pctStart(start: number) {
		return (start / count) * 100;
	}
	function pctWidth(start: number, stop: number) {
		return ((stop - start) / count) * 100;
	}
	function segFill(pal: number, col: WledColor[]) {
		return paletteGradient(palettes[pal] ?? 'Default', col);
	}

	// ---- drag to resize / move -----------------------------------------------------
	type Mode = 'start' | 'stop' | 'move';
	let drag: { id: number; mode: Mode; startX: number; origStart: number; origStop: number } | null =
		null;

	function ledsPerPx(): number {
		const w = trackEl?.getBoundingClientRect().width ?? 1;
		return count / Math.max(1, w);
	}

	function beginDrag(e: PointerEvent, id: number, mode: Mode) {
		const seg = segments.find((s) => s.id === id);
		if (!seg) return;
		ctrl.selectSegment(id);
		drag = { id, mode, startX: e.clientX, origStart: seg.start, origStop: seg.stop };
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', endDrag, { once: true });
		e.preventDefault();
	}

	function onMove(e: PointerEvent) {
		if (!drag) return;
		const deltaLeds = Math.round((e.clientX - drag.startX) * ledsPerPx());
		let start = drag.origStart;
		let stop = drag.origStop;
		if (drag.mode === 'start') start = drag.origStart + deltaLeds;
		else if (drag.mode === 'stop') stop = drag.origStop + deltaLeds;
		else {
			const len = drag.origStop - drag.origStart;
			start = Math.max(0, Math.min(count - len, drag.origStart + deltaLeds));
			stop = start + len;
		}
		ctrl.resizeSegment(drag.id, start, stop);
	}

	function endDrag() {
		if (!drag) return;
		const seg = segments.find((s) => s.id === drag!.id);
		if (seg) ctrl.resizeSegment(drag.id, seg.start, seg.stop, true);
		drag = null;
		window.removeEventListener('pointermove', onMove);
	}

	const ticks = [0, 0.25, 0.5, 0.75, 1];
</script>

<div class="strip-wrap">
	<div class="strip" bind:this={trackEl}>
		<canvas class="peek-layer" bind:this={canvasEl} class:visible={peeking}></canvas>
		{#each segments as seg (seg.id)}
			{@const selected = ctrl.selectedSegId === seg.id}
			<div
				class="seg-block"
				class:selected
				class:peek={peeking}
				style:left="{pctStart(seg.start)}%"
				style:width="{pctWidth(seg.start, seg.stop)}%"
				style:--fill={segFill(seg.pal, seg.col)}
				style:color={luminance(seg.col[0]) > 140 ? '#000' : '#fff'}
				onpointerdown={(e) => beginDrag(e, seg.id, 'move')}
				role="button"
				tabindex="0"
				aria-label={`Segment ${seg.id}, LEDs ${seg.start} to ${seg.stop}`}
			>
				<span
					class="handle left"
					role="button"
					tabindex="-1"
					aria-label={`Resize start of segment ${seg.id}`}
					onpointerdown={(e) => {
						e.stopPropagation();
						beginDrag(e, seg.id, 'start');
					}}
				></span>
				<span class="seg-label">{seg.id}</span>
				<span
					class="handle right"
					role="button"
					tabindex="-1"
					aria-label={`Resize end of segment ${seg.id}`}
					onpointerdown={(e) => {
						e.stopPropagation();
						beginDrag(e, seg.id, 'stop');
					}}
				></span>
			</div>
		{/each}
	</div>
	<div class="ruler">
		{#each ticks as t (t)}
			<span class="tick" style:left="{t * 100}%">{Math.round(t * count)}</span>
		{/each}
	</div>
</div>

<style>
	.strip-wrap {
		width: 100%;
	}
	.strip {
		position: relative;
		height: 72px;
		border-radius: 10px;
		background:
			repeating-linear-gradient(
				90deg,
				var(--bg-elev-2) 0,
				var(--bg-elev-2) 1px,
				transparent 1px,
				transparent 12px
			),
			var(--bg);
		border: 1px solid var(--border);
		overflow: hidden;
		touch-action: none;
		user-select: none;
	}
	.peek-layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		transition: opacity 0.2s var(--ease);
	}
	.peek-layer.visible {
		opacity: 1;
	}
	.seg-block {
		position: absolute;
		top: 6px;
		bottom: 6px;
		background: var(--fill);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: grab;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
		overflow: hidden;
	}
	.seg-block:active {
		cursor: grabbing;
	}
	.seg-block.selected {
		border-color: #fff;
		box-shadow:
			0 0 0 2px var(--accent),
			inset 0 0 0 1px rgba(0, 0, 0, 0.2);
		z-index: 2;
	}
	/* When peeking, dim the design fill so the real LED canvas shows through. */
	.seg-block.peek {
		background: color-mix(in srgb, var(--fill) 22%, transparent);
		border-color: rgba(255, 255, 255, 0.55);
	}
	.seg-label {
		font-size: 0.72rem;
		font-weight: 700;
		pointer-events: none;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
	}
	.handle {
		width: 12px;
		align-self: stretch;
		cursor: ew-resize;
		flex-shrink: 0;
		background: linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.2));
	}
	.handle.left {
		border-right: 1px solid rgba(0, 0, 0, 0.2);
	}
	.handle.right {
		border-left: 1px solid rgba(0, 0, 0, 0.2);
	}
	.ruler {
		position: relative;
		height: 18px;
		margin-top: 4px;
	}
	.tick {
		position: absolute;
		transform: translateX(-50%);
		font-size: 0.68rem;
		color: var(--text-faint);
		font-variant-numeric: tabular-nums;
	}
	.tick:first-child {
		transform: translateX(0);
	}
	.tick:last-child {
		transform: translateX(-100%);
	}
</style>
