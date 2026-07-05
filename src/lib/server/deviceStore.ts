/**
 * Persisted registry of known WLED devices.
 *
 * Milestone 1 uses a small JSON file under DATA_DIR (default ./data). The surface is
 * intentionally narrow (list/get/add/update/remove) so it can be swapped for SQLite
 * when the scene library lands, without touching callers.
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { removeScenesForDevice } from './sceneStore';

export interface Device {
	id: string;
	name: string;
	/** Host or IP of the device, e.g. "192.168.1.50". The literal "mock" targets the
	 *  in-process fake device (see mockDevice.ts) so the UI works without hardware. */
	host: string;
	/** Epoch ms this device was added. */
	addedAt: number;
}

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data');
const FILE = join(DATA_DIR, 'devices.json');

interface StoreShape {
	devices: Device[];
}

// Anchor the cache on globalThis so the HTTP routes (SSR module graph) and the WS proxy
// (dev Vite-config context / prod custom server) share ONE registry in-process. Without
// this, a device added at runtime is invisible to the WS proxy's separate module copy,
// which then rejects its socket as "unknown device".
const gstore = globalThis as unknown as { __wledDeviceStore?: StoreShape };

function load(): StoreShape {
	if (gstore.__wledDeviceStore) return gstore.__wledDeviceStore;
	if (existsSync(FILE)) {
		try {
			const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as StoreShape;
			gstore.__wledDeviceStore = Array.isArray(parsed.devices) ? parsed : { devices: [] };
		} catch {
			gstore.__wledDeviceStore = { devices: [] };
		}
	} else {
		// Seed with the mock device so a fresh install is immediately usable.
		gstore.__wledDeviceStore = {
			devices: [{ id: 'mock', name: 'Demo strip (mock)', host: 'mock', addedAt: Date.now() }]
		};
		persist();
	}
	return gstore.__wledDeviceStore;
}

function persist() {
	const data = gstore.__wledDeviceStore;
	if (!data) return;
	mkdirSync(dirname(FILE), { recursive: true });
	writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function listDevices(): Device[] {
	return load().devices;
}

export function getDevice(id: string): Device | undefined {
	return load().devices.find((d) => d.id === id);
}

export function addDevice(input: { name: string; host: string }): Device {
	const store = load();
	const device: Device = {
		id: randomUUID(),
		name: input.name.trim() || input.host,
		host: input.host.trim(),
		addedAt: Date.now()
	};
	store.devices.push(device);
	persist();
	return device;
}

export function updateDevice(
	id: string,
	patch: Partial<Pick<Device, 'name' | 'host'>>
): Device | undefined {
	const device = getDevice(id);
	if (!device) return undefined;
	if (patch.name !== undefined) device.name = patch.name;
	if (patch.host !== undefined) device.host = patch.host;
	persist();
	return device;
}

export function removeDevice(id: string): boolean {
	const store = load();
	const idx = store.devices.findIndex((d) => d.id === id);
	if (idx === -1) return false;
	store.devices.splice(idx, 1);
	persist();
	removeScenesForDevice(id); // cascade: drop the device's saved scenes
	return true;
}
