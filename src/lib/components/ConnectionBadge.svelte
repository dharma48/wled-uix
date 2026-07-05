<script lang="ts">
	import type { DeviceController } from '$lib/stores/device.svelte';
	let { ctrl }: { ctrl: DeviceController } = $props();
	let status = $derived(
		ctrl.error ? 'error' : ctrl.loading ? 'loading' : ctrl.connected ? 'live' : 'offline'
	);
	const labels: Record<string, string> = {
		error: 'Error',
		loading: 'Connecting…',
		live: 'Live',
		offline: 'Reconnecting…'
	};
</script>

<span class="badge {status}" title={ctrl.error ?? labels[status]}>
	<span class="dot"></span>
	{labels[status]}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-dim);
		padding: 4px 10px;
		border-radius: 999px;
		background: var(--bg-elev-2);
		border: 1px solid var(--border);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--text-faint);
	}
	.live .dot {
		background: var(--ok);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ok) 25%, transparent);
	}
	.loading .dot,
	.offline .dot {
		background: var(--warn);
		animation: pulse 1.2s ease-in-out infinite;
	}
	.error .dot {
		background: var(--danger);
	}
	@keyframes pulse {
		50% {
			opacity: 0.3;
		}
	}
</style>
