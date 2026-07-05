/**
 * Parsers for WLED live "peek" frames.
 *
 * Modern WLED streams peek over the websocket as a BINARY packet:
 *   byte0 = 'L' (0x4C); byte1 = version (1 = 1D, 2 = 2D matrix);
 *   for v2: byte2 = width, byte3 = height (already divided by the skip factor);
 *   then RGB triplets, 3 bytes per sampled LED (white already folded into RGB).
 * (Ref: WLED wled00/ws.cpp `sendLiveLedsWs`.)
 *
 * Some builds / the `/json/live` HTTP route instead return JSON `{"leds":["RRGGBB"],"n":N}`,
 * so we keep a JSON parser too.
 */

export interface LiveFrame {
	/** CSS-ready colors, one per sample, e.g. "#ff0080". */
	colors: string[];
	/** Sampling interval hint (1 unless a JSON frame supplies it). */
	n: number;
	/** Matrix width in samples (2D only). */
	w?: number;
	/** Matrix height in samples (2D only). */
	h?: number;
}

const LIVE_MAGIC = 0x4c; // 'L'

function hex2(n: number): string {
	return (n & 0xff).toString(16).padStart(2, '0');
}

/** True when a TEXT frame is a JSON live frame (not a state push, which also contains "leds"). */
export function isLiveFrameText(raw: string): boolean {
	return /^\s*\{\s*"leds"/.test(raw);
}

/** Decode WLED's binary 'L' peek packet. Returns null if it isn't one. */
export function parseLiveBinary(data: ArrayBuffer | Uint8Array): LiveFrame | null {
	const b = data instanceof Uint8Array ? data : new Uint8Array(data);
	if (b.length < 2 || b[0] !== LIVE_MAGIC) return null;
	const version = b[1];
	let offset = 2;
	let w: number | undefined;
	let h: number | undefined;
	if (version === 2) {
		if (b.length < 4) return null;
		w = b[2];
		h = b[3];
		offset = 4;
	}
	const colors: string[] = [];
	for (let i = offset; i + 3 <= b.length; i += 3) {
		colors.push(`#${hex2(b[i])}${hex2(b[i + 1])}${hex2(b[i + 2])}`);
	}
	return { colors, n: 1, w, h };
}

function toCss(hex: unknown): string {
	if (typeof hex !== 'string') return '#000000';
	const h = hex.trim().replace(/^#/, '').toLowerCase();
	if (/^[0-9a-f]{6,8}$/.test(h)) return `#${h.slice(0, 6)}`;
	return '#000000';
}

/** Parse a JSON live frame (`{"leds":[...],"n":N,"w":?,"h":?}`), or null if not one. */
export function parseLiveFrame(input: string | Record<string, unknown>): LiveFrame | null {
	let msg: Record<string, unknown>;
	if (typeof input === 'string') {
		try {
			msg = JSON.parse(input);
		} catch {
			return null;
		}
	} else {
		msg = input;
	}
	if (!msg || !Array.isArray(msg.leds)) return null;

	const colors = (msg.leds as unknown[]).map(toCss);
	const n = typeof msg.n === 'number' && msg.n > 0 ? msg.n : 1;
	const frame: LiveFrame = { colors, n };
	if (typeof msg.w === 'number') frame.w = msg.w;
	if (typeof msg.h === 'number') frame.h = msg.h;
	return frame;
}
