<script lang="ts">
	import { devices } from '$lib/stores/devices.svelte';
	import { activeController } from '$lib/stores/activeController.svelte';
	import { scenes } from '$lib/stores/scenes.svelte';
	import SceneCard from '$lib/components/SceneCard.svelte';

	let ctrl = $derived(activeController.controller);
	let palettes = $derived(ctrl?.bundle?.palettes ?? []);

	let saving = $state(false);
	let newName = $state('');

	// Load the active device's scenes whenever it changes.
	$effect(() => {
		const id = devices.active?.id;
		if (id) scenes.load(id);
	});

	function beginSave() {
		newName = defaultName();
		saving = true;
	}
	function defaultName() {
		const d = new Date();
		return `Scene ${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
	}
	async function doSave(e: Event) {
		e.preventDefault();
		const c = ctrl;
		const id = devices.active?.id;
		if (!c || !id || !newName.trim()) return;
		await scenes.create(id, newName.trim(), c.captureState(), c.ledCount);
		saving = false;
	}
</script>

<svelte:head><title>WLED UIX — Scenes</title></svelte:head>

{#if !devices.loaded}
	<div class="state-msg">Loading…</div>
{:else if !ctrl || !ctrl.bundle}
	<div class="state-msg card">
		<h2>No device</h2>
		<p class="faint">Add and connect a WLED device to save scenes.</p>
	</div>
{:else}
	<div class="scenes">
		<header class="scenes-head">
			<div>
				<h2>Scenes</h2>
				<span class="faint">Saved looks for {devices.active?.name}</span>
			</div>
			{#if saving}
				<form class="save-form" onsubmit={doSave}>
					<!-- svelte-ignore a11y_autofocus -->
					<input bind:value={newName} placeholder="Scene name" autofocus />
					<button type="submit" class="btn btn-primary">Save</button>
					<button type="button" class="btn btn-ghost" onclick={() => (saving = false)}>Cancel</button>
				</form>
			{:else}
				<button class="btn btn-primary" onclick={beginSave}>+ Save current look</button>
			{/if}
		</header>

		{#if scenes.error}
			<p class="err">{scenes.error}</p>
		{/if}

		{#if !scenes.loaded}
			<div class="state-msg">Loading scenes…</div>
		{:else if scenes.list.length === 0}
			<div class="empty card">
				<p>No scenes yet.</p>
				<p class="faint">
					Design a look on the Control or Designer tab, then “Save current look” to keep it here.
				</p>
			</div>
		{:else}
			<div class="grid">
				{#each scenes.list as scene (scene.id)}
					<SceneCard {scene} {ctrl} {palettes} />
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.state-msg {
		text-align: center;
		color: var(--text-dim);
		padding: 40px 24px;
	}
	.state-msg.card {
		max-width: 440px;
		margin: 60px auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
	}
	.scenes {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.scenes-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.scenes-head h2 {
		font-size: 1.15rem;
	}
	.scenes-head .faint {
		font-size: 0.82rem;
	}
	.save-form {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.save-form input {
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--accent);
		background: var(--bg-elev-2);
		font-size: 0.9rem;
		min-width: 200px;
	}
	.save-form input:focus {
		outline: none;
	}
	.err {
		color: var(--danger);
		font-size: 0.85rem;
		margin: 0;
	}
	.empty {
		padding: 40px;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.empty p {
		margin: 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 14px;
	}
</style>
