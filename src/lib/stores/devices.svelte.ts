/** Reactive registry of known devices, backed by the server's /api/devices endpoints. */
import { browser } from '$app/environment';

const ACTIVE_KEY = 'wled-uix.activeDeviceId';

export interface DeviceMeta {
	id: string;
	name: string;
	host: string;
	addedAt: number;
}

export interface Discovered {
	name: string;
	host: string;
	port: number;
}

class DevicesStore {
	list = $state<DeviceMeta[]>([]);
	loaded = $state(false);
	activeId = $state<string | null>(null);
	discovering = $state(false);
	discovered = $state<Discovered[]>([]);

	get active(): DeviceMeta | null {
		return this.list.find((d) => d.id === this.activeId) ?? this.list[0] ?? null;
	}

	/** Set the active device and remember it across refreshes. */
	private applyActive(id: string | null) {
		this.activeId = id;
		if (!browser) return;
		if (id) localStorage.setItem(ACTIVE_KEY, id);
		else localStorage.removeItem(ACTIVE_KEY);
	}

	async load() {
		if (!browser) return;
		const res = await fetch('/api/devices');
		const data = (await res.json()) as { devices: DeviceMeta[] };
		this.list = data.devices;
		if (!this.activeId) {
			// Restore the last-viewed device if it still exists, else fall back to the first.
			const saved = localStorage.getItem(ACTIVE_KEY);
			const restored = saved && this.list.some((d) => d.id === saved) ? saved : null;
			// Persist the resolved id so a stale/removed saved value self-heals.
			this.applyActive(restored ?? this.list[0]?.id ?? null);
		}
		this.loaded = true;
	}

	setActive(id: string) {
		this.applyActive(id);
	}

	async add(name: string, host: string): Promise<DeviceMeta | null> {
		const res = await fetch('/api/devices', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, host })
		});
		if (!res.ok) return null;
		const { device } = (await res.json()) as { device: DeviceMeta };
		this.list = [...this.list, device];
		this.applyActive(device.id);
		return device;
	}

	async remove(id: string) {
		await fetch(`/api/devices/${id}`, { method: 'DELETE' });
		this.list = this.list.filter((d) => d.id !== id);
		if (this.activeId === id) this.applyActive(this.list[0]?.id ?? null);
	}

	async discover() {
		this.discovering = true;
		try {
			const res = await fetch('/api/discover');
			const data = (await res.json()) as { devices: Discovered[] };
			// Hide devices already registered by host.
			const known = new Set(this.list.map((d) => d.host));
			this.discovered = data.devices.filter((d) => !known.has(d.host));
		} finally {
			this.discovering = false;
		}
	}
}

export const devices = new DevicesStore();
