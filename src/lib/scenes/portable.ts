/**
 * Portable scene format for export/import between installs. We export only the parts that
 * make sense to move — name, ledCount and the state — dropping install-specific fields
 * (id, deviceId, timestamps, synced presetId).
 */
import type { Scene, SceneState } from './types';

export const PORTABLE_VERSION = 1;

export interface PortableScene {
	name: string;
	ledCount: number;
	state: SceneState;
}

export interface SceneExport {
	app: 'wled-uix';
	version: number;
	exportedAt: number;
	scenes: PortableScene[];
}

/** Largest LED index referenced by a scene's segments (fallback for missing ledCount). */
function derivedLedCount(state: SceneState): number {
	return state.seg.reduce((max, s) => Math.max(max, s.stop ?? 0), 0);
}

export function toPortable(scene: Scene): PortableScene {
	return { name: scene.name, ledCount: scene.ledCount, state: scene.state };
}

export function buildExport(scenes: Scene[]): SceneExport {
	return {
		app: 'wled-uix',
		version: PORTABLE_VERSION,
		exportedAt: Date.now(),
		scenes: scenes.map(toPortable)
	};
}

function isValidState(state: unknown): state is SceneState {
	if (!state || typeof state !== 'object') return false;
	const s = state as Record<string, unknown>;
	return Array.isArray(s.seg) && typeof s.on === 'boolean' && typeof s.bri === 'number';
}

function coerceScene(raw: unknown): PortableScene | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;
	if (!isValidState(r.state)) return null;
	const state = r.state as SceneState;
	const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim() : 'Imported scene';
	const ledCount =
		typeof r.ledCount === 'number' && r.ledCount > 0 ? r.ledCount : derivedLedCount(state);
	return { name, ledCount, state };
}

/**
 * Parse an import payload. Accepts our export envelope, a bare array of scenes, or a single
 * scene object. Returns the valid scenes; throws if the JSON is bad or contains none.
 */
export function parseImport(raw: string): PortableScene[] {
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error('Not valid JSON');
	}

	let candidates: unknown[];
	if (Array.isArray(data)) {
		candidates = data;
	} else if (data && typeof data === 'object' && Array.isArray((data as SceneExport).scenes)) {
		candidates = (data as SceneExport).scenes;
	} else {
		candidates = [data];
	}

	const scenes = candidates.map(coerceScene).filter((s): s is PortableScene => s !== null);
	if (scenes.length === 0) throw new Error('No valid scenes found in file');
	return scenes;
}
