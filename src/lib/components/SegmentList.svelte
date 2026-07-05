<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	import { cssColor } from '$lib/wled/color';

	let { ctrl }: { ctrl: DeviceController } = $props();
	let segments = $derived(ctrl.segments);
	let effects = $derived(ctrl.bundle?.effects ?? []);
</script>

<div class="seg-list">
	{#each segments as seg (seg.id)}
		<button
			class="seg"
			class:active={ctrl.selectedSegId === seg.id}
			class:dim={seg.on === false}
			onclick={() => ctrl.selectSegment(seg.id)}
		>
			<span class="swatches" aria-hidden="true">
				{#each seg.col.slice(0, 3) as c, i (i)}
					{#if c && (c[0] || c[1] || c[2])}
						<span class="sw" style:background={cssColor(c)}></span>
					{/if}
				{/each}
			</span>
			<span class="meta">
				<span class="title">Segment {seg.id}</span>
				<span class="sub faint">{effects[seg.fx] ?? `FX ${seg.fx}`} · {seg.start}–{seg.stop}</span>
			</span>
			<span
				class="pwr"
				class:on={seg.on !== false}
				role="switch"
				aria-checked={seg.on !== false}
				tabindex="0"
				title="Toggle segment"
				onclick={(e) => {
					e.stopPropagation();
					ctrl.setSegPower(seg.id, seg.on === false);
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						e.stopPropagation();
						ctrl.setSegPower(seg.id, seg.on === false);
					}
				}}
			>
				<span class="pwr-knob"></span>
			</span>
		</button>
	{/each}
</div>

<style>
	.seg-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.seg {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		text-align: left;
		transition: border-color 0.12s var(--ease);
	}
	.seg.active {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
	}
	.seg.dim {
		opacity: 0.55;
	}
	.swatches {
		display: inline-flex;
	}
	.sw {
		width: 20px;
		height: 20px;
		border-radius: 5px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		margin-left: -6px;
	}
	.sw:first-child {
		margin-left: 0;
	}
	.meta {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
	.title {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.sub {
		font-size: 0.76rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pwr {
		width: 38px;
		height: 22px;
		border-radius: 999px;
		background: var(--surface);
		border: 1px solid var(--border);
		position: relative;
		flex-shrink: 0;
		cursor: pointer;
	}
	.pwr.on {
		background: color-mix(in srgb, var(--ok) 65%, transparent);
		border-color: transparent;
	}
	.pwr-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--text-faint);
		transition: all 0.15s var(--ease);
	}
	.pwr.on .pwr-knob {
		left: 18px;
		background: #fff;
	}
</style>
