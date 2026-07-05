<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	import { scenes } from '$lib/stores/scenes.svelte';
	import type { Scene } from '$lib/scenes/types';
	import SceneThumbnail from './SceneThumbnail.svelte';

	let {
		scene,
		ctrl,
		palettes = []
	}: { scene: Scene; ctrl: DeviceController; palettes?: string[] } = $props();

	let editing = $state(false);
	let draftName = $state('');
	let confirmingDelete = $state(false);
	let busy = $derived(scenes.busyId === scene.id);

	function apply() {
		ctrl.applyScene(scene.state);
	}

	function startRename() {
		draftName = scene.name;
		editing = true;
	}
	async function commitRename() {
		editing = false;
		const name = draftName.trim();
		if (name && name !== scene.name) await scenes.rename(scene.id, name);
	}

	function togglePreset() {
		if (scene.presetId != null) scenes.unsyncPreset(scene);
		else scenes.syncPreset(scene);
	}
</script>

<div class="scene-card card" class:busy>
	<button class="thumb-btn" onclick={apply} title="Apply this scene">
		<SceneThumbnail {scene} {palettes} />
	</button>

	<div class="head">
		{#if editing}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="name-input"
				bind:value={draftName}
				autofocus
				onblur={commitRename}
				onkeydown={(e) => {
					if (e.key === 'Enter') commitRename();
					if (e.key === 'Escape') editing = false;
				}}
			/>
		{:else}
			<button class="name" onclick={startRename} title="Rename">{scene.name}</button>
		{/if}
		{#if scene.presetId != null}
			<span class="preset-badge" title="Synced to WLED preset slot {scene.presetId}">
				Preset {scene.presetId}
			</span>
		{/if}
	</div>

	<div class="actions">
		<button class="btn btn-primary apply" onclick={apply}>Apply</button>
		<div class="icons">
			<button class="icon" title="Duplicate" onclick={() => scenes.duplicate(scene)}>⧉</button>
			<button
				class="icon"
				class:on={scene.presetId != null}
				title={scene.presetId != null ? 'Remove synced preset' : 'Apply & save as a WLED preset'}
				disabled={busy}
				onclick={togglePreset}
			>
				{busy ? '…' : '★'}
			</button>
			{#if confirmingDelete}
				<button class="icon danger" title="Confirm delete" onclick={() => scenes.remove(scene.id)}
					>✓</button
				>
				<button class="icon" title="Cancel" onclick={() => (confirmingDelete = false)}>✕</button>
			{:else}
				<button class="icon danger" title="Delete" onclick={() => (confirmingDelete = true)}>🗑</button
				>
			{/if}
		</div>
	</div>
</div>

<style>
	.scene-card {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition: opacity 0.15s var(--ease);
	}
	.scene-card.busy {
		opacity: 0.6;
	}
	.thumb-btn {
		display: block;
		padding: 0;
		width: 100%;
		background: none;
		border: none;
		cursor: pointer;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: space-between;
	}
	.name {
		font-weight: 600;
		font-size: 0.95rem;
		text-align: left;
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 2px 0;
	}
	.name:hover {
		color: var(--accent);
	}
	.name-input {
		flex: 1;
		min-width: 0;
		padding: 5px 8px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--accent);
		background: var(--bg-elev-2);
		font-size: 0.92rem;
		font-weight: 600;
	}
	.name-input:focus {
		outline: none;
	}
	.preset-badge {
		flex-shrink: 0;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 2px 7px;
		border-radius: 5px;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 16%, transparent);
	}
	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.apply {
		padding: 7px 18px;
		font-size: 0.85rem;
	}
	.icons {
		display: flex;
		gap: 2px;
	}
	.icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		font-size: 0.95rem;
		color: var(--text-dim);
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.icon:hover:not(:disabled) {
		background: var(--bg-elev-2);
		color: var(--text);
	}
	.icon.on {
		color: var(--accent);
	}
	.icon.danger:hover {
		color: var(--danger);
	}
	.icon:disabled {
		cursor: default;
	}
</style>
