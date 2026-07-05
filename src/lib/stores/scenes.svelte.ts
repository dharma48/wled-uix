/**
 * Reactive scene library for the active device, backed by the /api/.../scenes endpoints.
 * Scenes are device-scoped. Preset sync applies the scene to the device then psave's it.
 */
import { browser } from '$app/environment';
import { WledClient } from '$lib/wled/client';
import { nextFreePreset } from '$lib/wled/presets';
import type { Scene, SceneState } from '$lib/scenes/types';
import type { PortableScene } from '$lib/scenes/portable';

const JSON_HEADERS = { 'content-type': 'application/json' };

class ScenesStore {
	list = $state<Scene[]>([]);
	loaded = $state(false);
	error = $state<string | null>(null);
	busyId = $state<string | null>(null);
	private deviceId: string | null = null;

	async load(deviceId: string) {
		if (!browser) return;
		this.deviceId = deviceId;
		this.loaded = false;
		try {
			const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/scenes`);
			const data = (await res.json()) as { scenes?: Scene[] };
			this.list = data.scenes ?? [];
		} catch (e) {
			this.error = (e as Error).message;
			this.list = [];
		} finally {
			this.loaded = true;
		}
	}

	async create(
		deviceId: string,
		name: string,
		state: SceneState,
		ledCount: number
	): Promise<Scene | null> {
		const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/scenes`, {
			method: 'POST',
			headers: JSON_HEADERS,
			body: JSON.stringify({ name, state, ledCount })
		});
		if (!res.ok) {
			this.error = 'Could not save scene';
			return null;
		}
		const { scene } = (await res.json()) as { scene: Scene };
		if (deviceId === this.deviceId) this.list = [scene, ...this.list];
		return scene;
	}

	private async update(id: string, patch: Record<string, unknown>): Promise<Scene | null> {
		const res = await fetch(`/api/scenes/${id}`, {
			method: 'PUT',
			headers: JSON_HEADERS,
			body: JSON.stringify(patch)
		});
		if (!res.ok) return null;
		const { scene } = (await res.json()) as { scene: Scene };
		this.list = this.list.map((s) => (s.id === id ? scene : s));
		return scene;
	}

	rename(id: string, name: string) {
		return this.update(id, { name });
	}

	duplicate(scene: Scene) {
		return this.create(scene.deviceId, `${scene.name} copy`, scene.state, scene.ledCount);
	}

	/** Import portable scenes into a device's library. Returns how many were added. */
	async importMany(deviceId: string, items: PortableScene[]): Promise<number> {
		let count = 0;
		for (const it of items) {
			if (await this.create(deviceId, it.name, it.state, it.ledCount)) count++;
		}
		return count;
	}

	async remove(id: string) {
		await fetch(`/api/scenes/${id}`, { method: 'DELETE' });
		this.list = this.list.filter((s) => s.id !== id);
	}

	/** Apply the scene to the device and save it into the lowest free WLED preset slot. */
	async syncPreset(scene: Scene): Promise<void> {
		this.busyId = scene.id;
		this.error = null;
		try {
			const presets = (await fetch(`/api/devices/${scene.deviceId}/presets`).then((r) =>
				r.json()
			)) as Record<string, unknown>;
			const used = Object.keys(presets)
				.map(Number)
				.filter((n) => n > 0);
			const slot = nextFreePreset(used);
			if (slot == null) {
				this.error = 'No free preset slots on this device (all 250 used)';
				return;
			}
			const client = new WledClient(scene.deviceId);
			await client.applyState(scene.state);
			await client.savePreset(slot, scene.name);
			await this.update(scene.id, { presetId: slot });
		} catch (e) {
			this.error = (e as Error).message;
		} finally {
			this.busyId = null;
		}
	}

	/** Remove the scene's synced WLED preset and clear the link. */
	async unsyncPreset(scene: Scene): Promise<void> {
		this.busyId = scene.id;
		try {
			if (scene.presetId != null) {
				await new WledClient(scene.deviceId).deletePreset(scene.presetId).catch(() => {});
			}
			await this.update(scene.id, { presetId: null });
		} finally {
			this.busyId = null;
		}
	}
}

export const scenes = new ScenesStore();
