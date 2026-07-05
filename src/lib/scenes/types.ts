import type { WledSegment } from '$lib/wled/types';

/**
 * A saved scene: a named snapshot of a device's full look, stored app-side (no 250-preset
 * cap). Device-scoped — each scene belongs to the device it was captured on.
 */
export interface Scene {
	id: string;
	deviceId: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	/** LED count when captured — kept so thumbnails render without the device present. */
	ledCount: number;
	/** The device state this scene applies. */
	state: SceneState;
	/** WLED preset slot this scene is synced to, if any. */
	presetId?: number;
}

export interface SceneState {
	on: boolean;
	bri: number;
	seg: WledSegment[];
}

/** Payload accepted when creating a scene. */
export interface SceneCreate {
	name: string;
	ledCount: number;
	state: SceneState;
}
