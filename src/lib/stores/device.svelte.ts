/**
 * Reactive controller for a single WLED device (Svelte 5 runes).
 *
 * - Loads the /json bundle + /json/fxdata once.
 * - Subscribes to the device WS for live state pushes (also reflects changes made from
 *   WLED's own UI or another client).
 * - Writes are optimistic (local state updates immediately) and coalesced/throttled so
 *   slider drags don't flood the MCU; the authoritative state arrives back over the WS.
 */
import { browser } from '$app/environment';
import { WledClient } from '$lib/wled/client';
import { parseFxDataArray, type EffectMeta } from '$lib/wled/fxdata';
import { isLiveFrame, parseLiveFrame, type LiveFrame } from '$lib/wled/live';
import { throttle } from '$lib/wled/throttle';
import type { WledBundle, WledColor, WledSegment, WledState } from '$lib/wled/types';

const WRITE_COALESCE_MS = 60;

export class DeviceController {
	readonly id: string;
	private client: WledClient;

	bundle = $state<WledBundle | null>(null);
	fxMeta = $state<EffectMeta[]>([]);
	connected = $state(false);
	loading = $state(true);
	error = $state<string | null>(null);
	selectedSegId = $state(0);
	/** Latest live-peek frame, or null when peek is off. */
	liveFrame = $state<LiveFrame | null>(null);
	peeking = $state(false);

	private ws: WebSocket | null = null;
	private wsRetry: ReturnType<typeof setTimeout> | null = null;
	/** Whether the designer wants the live-peek stream (survives WS reconnects). */
	private wantPeek = false;
	private destroyed = false;
	private pending = new Map<number, Record<string, unknown>>();
	private flushSoon = throttle(() => this.flush(), WRITE_COALESCE_MS);

	constructor(id: string) {
		this.id = id;
		this.client = new WledClient(id);
	}

	get state(): WledState | null {
		return this.bundle?.state ?? null;
	}
	get segments(): WledSegment[] {
		return this.bundle?.state.seg.filter((s) => s.stop > s.start) ?? [];
	}
	get selectedSegment(): WledSegment | null {
		return this.segments.find((s) => s.id === this.selectedSegId) ?? this.segments[0] ?? null;
	}
	metaFor(fx: number): EffectMeta | undefined {
		return this.fxMeta[fx];
	}

	async init() {
		this.loading = true;
		this.error = null;
		try {
			const [bundle, fxdata] = await Promise.all([this.client.getBundle(), this.client.getFxData()]);
			this.bundle = bundle;
			this.fxMeta = parseFxDataArray(fxdata);
			const main = bundle.state.mainseg ?? bundle.state.seg.find((s) => s.stop > s.start)?.id ?? 0;
			this.selectedSegId = main;
		} catch (err) {
			this.error = (err as Error).message;
		} finally {
			this.loading = false;
		}
		if (browser) this.connectWs();
	}

	destroy() {
		this.destroyed = true;
		this.wantPeek = false;
		this.peeking = false;
		if (this.wsRetry) clearTimeout(this.wsRetry);
		this.ws?.close();
		this.flushSoon.cancel();
	}

	// ---- live connection ----------------------------------------------------------

	private connectWs() {
		const proto = location.protocol === 'https:' ? 'wss' : 'ws';
		const url = `${proto}://${location.host}/api/devices/${encodeURIComponent(this.id)}/ws`;
		const ws = new WebSocket(url);
		this.ws = ws;
		ws.onopen = () => {
			this.connected = true;
			ws.send(JSON.stringify({ v: true }));
			if (this.wantPeek) ws.send(JSON.stringify({ lv: true }));
		};
		ws.onmessage = (ev) => this.onWsMessage(ev.data);
		ws.onclose = () => {
			this.connected = false;
			if (!this.destroyed) this.wsRetry = setTimeout(() => this.connectWs(), 2000);
		};
		ws.onerror = () => ws.close();
	}

	private onWsMessage(data: string) {
		// Live-peek frames are high-frequency; handle them before the state path.
		if (isLiveFrame(data)) {
			const frame = parseLiveFrame(data);
			if (frame) this.liveFrame = frame;
			return;
		}
		try {
			const msg = JSON.parse(data);
			// WLED sends {state, info}; the mock sends a bare state object.
			const state: WledState | undefined = msg.state ?? (msg.seg ? msg : undefined);
			if (state && this.bundle) {
				this.bundle.state = state;
				if (msg.info) this.bundle.info = msg.info;
			}
		} catch {
			/* ignore non-JSON frames */
		}
	}

	private sendWs(obj: unknown) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
	}

	// ---- live peek -----------------------------------------------------------------

	/** Request the live LED "peek" stream from the device. */
	startPeek() {
		this.wantPeek = true;
		this.peeking = true;
		this.sendWs({ lv: true });
	}

	/** Stop the live peek stream. */
	stopPeek() {
		this.wantPeek = false;
		this.peeking = false;
		this.liveFrame = null;
		this.sendWs({ lv: false });
	}

	// ---- writes -------------------------------------------------------------------

	private queueSeg(id: number, patch: Record<string, unknown>, immediate = false) {
		const cur = this.pending.get(id) ?? {};
		Object.assign(cur, patch);
		this.pending.set(id, cur);
		if (immediate) {
			this.flushSoon.cancel();
			this.flush();
		} else {
			this.flushSoon();
		}
	}

	private flush() {
		if (this.pending.size === 0) return;
		const seg = [...this.pending.entries()].map(([id, p]) => ({ id, ...p }));
		this.pending.clear();
		this.client.setState({ seg: seg as unknown as WledSegment[] }).catch((e) => {
			this.error = (e as Error).message;
		});
	}

	private mutateSelected(fn: (s: WledSegment) => void) {
		const seg = this.selectedSegment;
		if (seg) fn(seg);
	}

	togglePower() {
		if (!this.state) return;
		const on = !this.state.on;
		this.state.on = on; // optimistic
		this.client.setPower(on).catch((e) => (this.error = (e as Error).message));
	}

	setBrightness(bri: number) {
		if (!this.state) return;
		this.state.bri = bri; // optimistic
		this.brightnessWrite(bri);
	}
	private brightnessWrite = throttle((bri: number) => {
		this.client.setBrightness(bri).catch((e) => (this.error = (e as Error).message));
	}, WRITE_COALESCE_MS);

	selectSegment(id: number) {
		this.selectedSegId = id;
	}

	setSegColor(index: number, rgb: WledColor) {
		this.mutateSelected((s) => {
			const col = s.col.map((c) => [...c]) as WledColor[];
			col[index] = rgb;
			s.col = col;
		});
		const seg = this.selectedSegment;
		if (seg) this.queueSeg(seg.id, { col: this.colPayload(seg, index, rgb) });
	}

	/** Send only the changed color slot, padded with nulls for earlier slots. */
	private colPayload(seg: WledSegment, index: number, rgb: WledColor) {
		const col: (WledColor | [])[] = [];
		for (let i = 0; i < index; i++) col.push([]);
		col.push(rgb);
		return col;
	}

	setSegEffect(fx: number) {
		this.mutateSelected((s) => (s.fx = fx));
		const seg = this.selectedSegment;
		if (seg) this.queueSeg(seg.id, { fx }, true);
	}

	setSegPalette(pal: number) {
		this.mutateSelected((s) => (s.pal = pal));
		const seg = this.selectedSegment;
		if (seg) this.queueSeg(seg.id, { pal }, true);
	}

	setSegSlider(key: 'sx' | 'ix' | 'c1' | 'c2' | 'c3', value: number) {
		this.mutateSelected((s) => (s[key] = value));
		const seg = this.selectedSegment;
		if (seg) this.queueSeg(seg.id, { [key]: value });
	}

	setSegCct(value: number) {
		this.mutateSelected((s) => (s.cct = value));
		const seg = this.selectedSegment;
		if (seg) this.queueSeg(seg.id, { cct: value });
	}

	setSegCheckbox(key: 'o1' | 'o2' | 'o3', value: boolean) {
		this.mutateSelected((s) => (s[key] = value));
		const seg = this.selectedSegment;
		if (seg) this.queueSeg(seg.id, { [key]: value }, true);
	}

	setSegPower(id: number, on: boolean) {
		const seg = this.segments.find((s) => s.id === id);
		if (seg) seg.on = on;
		this.queueSeg(id, { on }, true);
	}

	applyPreset(ps: number) {
		this.client.applyPreset(ps).catch((e) => (this.error = (e as Error).message));
	}

	// ---- segment geometry (designer) -----------------------------------------------

	get ledCount(): number {
		return this.bundle?.info.leds.count ?? 0;
	}
	get maxSeg(): number {
		return this.bundle?.info.leds.maxseg ?? 16;
	}
	get canAddSegment(): boolean {
		return this.segments.length < this.maxSeg;
	}

	/** Largest uncovered LED range; falls back to splitting the last segment's tail. */
	private largestGap(): { start: number; stop: number } {
		const count = this.ledCount;
		const segs = this.segments.slice().sort((a, b) => a.start - b.start);
		if (segs.length === 0) return { start: 0, stop: count };
		let bestStart = 0;
		let bestLen = 0;
		let cursor = 0;
		const consider = (from: number, to: number) => {
			if (to - from > bestLen) {
				bestLen = to - from;
				bestStart = from;
			}
		};
		for (const s of segs) {
			if (s.start > cursor) consider(cursor, s.start);
			cursor = Math.max(cursor, s.stop);
		}
		if (count > cursor) consider(cursor, count);
		if (bestLen <= 0) {
			const last = segs[segs.length - 1];
			return { start: Math.floor((last.start + last.stop) / 2), stop: last.stop };
		}
		return { start: bestStart, stop: bestStart + bestLen };
	}

	/** Create a new segment in the largest free range. Returns its id, or null if full. */
	addSegment(): number | null {
		const state = this.state;
		if (!state || !this.canAddSegment) return null;
		const used = new Set(this.segments.map((s) => s.id));
		let id = 0;
		while (used.has(id) && id < this.maxSeg) id++;
		if (id >= this.maxSeg) return null;

		const { start, stop } = this.largestGap();
		const newSeg: WledSegment = {
			id,
			start,
			stop,
			col: [
				[255, 255, 255],
				[0, 0, 0],
				[0, 0, 0]
			],
			fx: 0,
			sx: 128,
			ix: 128,
			pal: 0,
			on: true,
			bri: 255
		};
		// Optimistic: add locally, keep the underlying seg array ordered by id.
		state.seg = [...state.seg.filter((s) => s.id !== id), newSeg].sort((a, b) => a.id - b.id);
		this.selectedSegId = id;
		this.queueSeg(id, { start, stop, fx: 0, pal: 0, on: true, col: [[255, 255, 255]] }, true);
		return id;
	}

	/** Delete a segment (WLED removes it when stop <= start). */
	deleteSegment(id: number) {
		const state = this.state;
		if (!state) return;
		state.seg = state.seg.filter((s) => s.id !== id);
		if (this.selectedSegId === id) this.selectedSegId = this.segments[0]?.id ?? 0;
		this.queueSeg(id, { stop: 0 }, true);
	}

	/** Resize/move a segment. Throttled during drag, immediate on release. */
	resizeSegment(id: number, start: number, stop: number, immediate = false) {
		const count = this.ledCount;
		let a = Math.max(0, Math.min(count, Math.round(start)));
		let b = Math.max(0, Math.min(count, Math.round(stop)));
		if (b < a) [a, b] = [b, a];
		if (b === a) b = Math.min(count, a + 1); // keep at least 1 LED so it isn't deleted
		const seg = this.segments.find((s) => s.id === id);
		if (seg) {
			seg.start = a;
			seg.stop = b;
		}
		this.queueSeg(id, { start: a, stop: b }, immediate);
	}
}
