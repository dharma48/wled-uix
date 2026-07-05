<script lang="ts">
	import { devices } from '$lib/stores/devices.svelte';

	let open = $state(false);
	let adding = $state(false);
	let name = $state('');
	let host = $state('');
	let saving = $state(false);

	async function submitAdd(e: Event) {
		e.preventDefault();
		if (!host.trim()) return;
		saving = true;
		const d = await devices.add(name.trim() || host.trim(), host.trim());
		saving = false;
		if (d) {
			name = '';
			host = '';
			adding = false;
			open = false;
		}
	}

	function useDiscovered(dhost: string, dname: string) {
		host = dhost;
		name = dname;
	}
</script>

<div class="switcher">
	<button class="current" onclick={() => (open = !open)} aria-expanded={open}>
		<span class="pin"></span>
		<span class="cur-name">{devices.active?.name ?? 'No device'}</span>
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		</svg>
	</button>

	{#if open}
		<div class="panel card">
			<div class="dev-list">
				{#each devices.list as d (d.id)}
					<div class="dev-row" class:active={devices.active?.id === d.id}>
						<button class="dev-pick" onclick={() => { devices.setActive(d.id); open = false; }}>
							<span class="dev-name">{d.name}</span>
							<span class="faint dev-host">{d.host}</span>
						</button>
						{#if devices.list.length > 1}
							<button class="dev-del" title="Remove" onclick={() => devices.remove(d.id)}>✕</button>
						{/if}
					</div>
				{/each}
			</div>

			{#if !adding}
				<button class="btn add-btn" onclick={() => { adding = true; devices.discover(); }}>
					+ Add device
				</button>
			{:else}
				<form class="add-form" onsubmit={submitAdd}>
					<input placeholder="IP or hostname (e.g. 192.168.1.50)" bind:value={host} required />
					<input placeholder="Name (optional)" bind:value={name} />
					<div class="add-actions">
						<button type="button" class="btn btn-ghost" onclick={() => (adding = false)}>Cancel</button>
						<button type="submit" class="btn btn-primary" disabled={saving}>
							{saving ? 'Adding…' : 'Add'}
						</button>
					</div>

					<div class="discover">
						<span class="faint disc-head">
							{devices.discovering ? 'Scanning your network…' : 'Discovered on network'}
						</span>
						{#each devices.discovered as disc (disc.host)}
							<button type="button" class="disc-item" onclick={() => useDiscovered(disc.host, disc.name)}>
								<span>{disc.name}</span>
								<span class="faint">{disc.host}</span>
							</button>
						{/each}
						{#if !devices.discovering && devices.discovered.length === 0}
							<span class="faint disc-empty">None found — enter an address above.</span>
						{/if}
					</div>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.switcher {
		position: relative;
	}
	.current {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		padding: 9px 14px;
		border-radius: 999px;
		background: var(--bg-elev);
		border: 1px solid var(--border);
		font-weight: 600;
		max-width: 60vw;
	}
	.pin {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
	}
	.cur-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.panel {
		/* Fixed to the viewport so the panel can never overflow off either edge,
		   regardless of where the switcher sits in the top bar. */
		position: fixed;
		top: calc(58px + env(safe-area-inset-top));
		right: 12px;
		z-index: 40;
		width: min(340px, calc(100vw - 24px));
		max-height: calc(100dvh - 80px);
		overflow-y: auto;
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		box-shadow: var(--shadow);
	}
	.dev-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.dev-row {
		display: flex;
		align-items: center;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
	}
	.dev-row.active {
		border-color: var(--border);
		background: var(--bg-elev-2);
	}
	.dev-pick {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 8px 10px;
		text-align: left;
	}
	.dev-name {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.dev-host {
		font-size: 0.76rem;
	}
	.dev-del {
		padding: 8px 10px;
		color: var(--text-faint);
	}
	.dev-del:hover {
		color: var(--danger);
	}
	.add-btn {
		justify-content: center;
	}
	.add-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.add-form input {
		padding: 9px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--bg-elev-2);
		font-size: 0.88rem;
	}
	.add-form input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.add-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
	.discover {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin-top: 4px;
		border-top: 1px solid var(--border);
		padding-top: 8px;
	}
	.disc-head,
	.disc-empty {
		font-size: 0.76rem;
	}
	.disc-item {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		background: var(--bg-elev-2);
		border: 1px solid var(--border);
		font-size: 0.84rem;
	}
	.disc-item:hover {
		border-color: var(--accent);
	}
</style>
