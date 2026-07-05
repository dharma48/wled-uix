/**
 * Persisted store of saved scenes, mirroring deviceStore.ts: a JSON file under DATA_DIR,
 * with the cache anchored on globalThis so every module context shares one instance.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Scene, SceneCreate } from '$lib/scenes/types';

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data');
const FILE = join(DATA_DIR, 'scenes.json');

interface StoreShape {
	scenes: Scene[];
}

const gstore = globalThis as unknown as { __wledSceneStore?: StoreShape };

function load(): StoreShape {
	if (gstore.__wledSceneStore) return gstore.__wledSceneStore;
	if (existsSync(FILE)) {
		try {
			const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as StoreShape;
			gstore.__wledSceneStore = Array.isArray(parsed.scenes) ? parsed : { scenes: [] };
		} catch {
			gstore.__wledSceneStore = { scenes: [] };
		}
	} else {
		gstore.__wledSceneStore = { scenes: [] };
	}
	return gstore.__wledSceneStore;
}

function persist() {
	const data = gstore.__wledSceneStore;
	if (!data) return;
	mkdirSync(dirname(FILE), { recursive: true });
	writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

/** Scenes for a device, newest first. */
export function listScenes(deviceId: string): Scene[] {
	return load()
		.scenes.filter((s) => s.deviceId === deviceId)
		.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getScene(id: string): Scene | undefined {
	return load().scenes.find((s) => s.id === id);
}

export function addScene(deviceId: string, input: SceneCreate): Scene {
	const now = Date.now();
	const scene: Scene = {
		id: randomUUID(),
		deviceId,
		name: input.name.trim() || 'Untitled scene',
		createdAt: now,
		updatedAt: now,
		ledCount: input.ledCount,
		state: input.state
	};
	load().scenes.push(scene);
	persist();
	return scene;
}

export function updateScene(
	id: string,
	patch: Partial<Pick<Scene, 'name' | 'state' | 'ledCount' | 'presetId'>>
): Scene | undefined {
	const scene = getScene(id);
	if (!scene) return undefined;
	if (patch.name !== undefined) scene.name = patch.name;
	if (patch.state !== undefined) scene.state = patch.state;
	if (patch.ledCount !== undefined) scene.ledCount = patch.ledCount;
	// presetId can be cleared by passing null via JSON; treat null/undefined-in-patch as clear.
	if ('presetId' in patch) scene.presetId = patch.presetId ?? undefined;
	scene.updatedAt = Date.now();
	persist();
	return scene;
}

export function removeScene(id: string): boolean {
	const store = load();
	const idx = store.scenes.findIndex((s) => s.id === id);
	if (idx === -1) return false;
	store.scenes.splice(idx, 1);
	persist();
	return true;
}

/** Cascade delete when a device is removed. */
export function removeScenesForDevice(deviceId: string): void {
	const store = load();
	const before = store.scenes.length;
	store.scenes = store.scenes.filter((s) => s.deviceId !== deviceId);
	if (store.scenes.length !== before) persist();
}
