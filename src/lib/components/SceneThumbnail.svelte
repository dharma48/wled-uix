<script lang="ts">
	import type { Scene } from '$lib/scenes/types';
	import { cssColor } from '$lib/wled/color';
	import { paletteGradient } from '$lib/wled/palettes';
	import type { WledColor } from '$lib/wled/types';

	let { scene, palettes = [] }: { scene: Scene; palettes?: string[] } = $props();

	let count = $derived(Math.max(1, scene.ledCount || 1));
	let segs = $derived(scene.state.seg.filter((s) => s.stop > s.start));

	function fill(pal: number, col: WledColor[]) {
		// Use the palette gradient when we know the palette name, else the primary color.
		return palettes.length ? paletteGradient(palettes[pal] ?? 'Default', col) : cssColor(col[0]);
	}
</script>

<div class="thumb" class:off={!scene.state.on}>
	{#each segs as seg (seg.id)}
		<span
			class="seg"
			style:left="{(seg.start / count) * 100}%"
			style:width="{((seg.stop - seg.start) / count) * 100}%"
			style:background={fill(seg.pal, seg.col)}
		></span>
	{/each}
</div>

<style>
	.thumb {
		position: relative;
		height: 30px;
		width: 100%;
		border-radius: 6px;
		overflow: hidden;
		background:
			repeating-linear-gradient(
				90deg,
				rgba(255, 255, 255, 0.04) 0,
				rgba(255, 255, 255, 0.04) 1px,
				transparent 1px,
				transparent 10px
			),
			var(--bg);
		border: 1px solid var(--border);
	}
	.thumb.off {
		opacity: 0.4;
	}
	.seg {
		position: absolute;
		top: 3px;
		bottom: 3px;
		border-radius: 3px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
	}
</style>
