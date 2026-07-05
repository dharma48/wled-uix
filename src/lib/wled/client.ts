/**
 * Browser-side WLED client. Every request is same-origin to our own proxy at
 * `/api/devices/<id>/json/*`, which forwards to the real device — this is what
 * sidesteps WLED's missing CORS headers and HTTP/HTTPS mixed content.
 */
import type { SceneState } from '$lib/scenes/types';
import type { WledBundle, WledSegment, WledState } from './types';

/** A state POST body: known WLED state fields plus preset/save control keys. */
export type WledStateWrite = Partial<WledState> & {
	psave?: number;
	pdel?: number;
	n?: string;
	ib?: boolean;
	sb?: boolean;
	sc?: boolean;
	v?: boolean;
};

export class WledClient {
	constructor(private readonly deviceId: string) {}

	private base() {
		return `/api/devices/${encodeURIComponent(this.deviceId)}/json`;
	}

	private async get<T>(path: string): Promise<T> {
		const res = await fetch(`${this.base()}${path}`, {
			headers: { accept: 'application/json' }
		});
		if (!res.ok) throw new Error(`WLED GET ${path} failed: ${res.status}`);
		return res.json() as Promise<T>;
	}

	/** Full bundle (state + info + effects + palettes) via `GET /json`. */
	getBundle(): Promise<WledBundle> {
		return this.get<WledBundle>('');
	}

	/** Per-effect metadata array via `GET /json/fxdata`. */
	getFxData(): Promise<string[]> {
		return this.get<string[]>('/fxdata');
	}

	/** Post a partial state; returns the device's acknowledged state. */
	async setState(partial: WledStateWrite): Promise<WledState> {
		const res = await fetch(`${this.base()}/state`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			// v=true asks WLED to return the full updated state.
			body: JSON.stringify({ ...partial, v: true })
		});
		if (!res.ok) throw new Error(`WLED setState failed: ${res.status}`);
		return res.json() as Promise<WledState>;
	}

	/** Patch a single segment by id. */
	setSegment(id: number, patch: Partial<WledSegment>): Promise<WledState> {
		return this.setState({ seg: [{ id, ...patch }] as unknown as WledSegment[] });
	}

	setPower(on: boolean): Promise<WledState> {
		return this.setState({ on });
	}

	setBrightness(bri: number): Promise<WledState> {
		return this.setState({ bri });
	}

	/** Apply an existing preset by id. */
	applyPreset(ps: number): Promise<WledState> {
		return this.setState({ ps });
	}

	/** Push a full state (used to apply a saved scene). */
	applyState(state: SceneState): Promise<WledState> {
		return this.setState(state);
	}

	/** Save the current device state into a WLED preset slot with a name. */
	savePreset(slot: number, name: string): Promise<WledState> {
		return this.setState({ psave: slot, n: name, ib: true, sb: true });
	}

	/** Delete a WLED preset slot. */
	deletePreset(slot: number): Promise<WledState> {
		return this.setState({ pdel: slot });
	}
}
