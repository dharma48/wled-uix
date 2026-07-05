/**
 * Parser for WLED live "peek" frames (`{"lv":true}` over the WS / `/json/live`).
 *
 * Format (from WLED source): `{"leds":["RRGGBB",...],"n":<interval>}` — uppercase hex,
 * capped to 256 samples, `n` = every nth physical LED sampled. 2D matrices add `"w"`/`"h"`.
 */

export interface LiveFrame {
	/** CSS-ready colors, one per sample, e.g. "#ff0080". */
	colors: string[];
	/** Sampling interval: each color represents `n` physical LEDs. */
	n: number;
	/** Matrix width in samples (2D only). */
	w?: number;
	/** Matrix height in samples (2D only). */
	h?: number;
}

/** True when a raw WS frame looks like a live-peek frame (cheap check, no parse). */
export function isLiveFrame(raw: string): boolean {
	return raw.includes('"leds"');
}

function toCss(hex: unknown): string {
	if (typeof hex !== 'string') return '#000000';
	const h = hex.trim().replace(/^#/, '').toLowerCase();
	// WLED sends RRGGBB (sometimes RRGGBBWW for RGBW — take the first 6).
	if (/^[0-9a-f]{6,8}$/.test(h)) return `#${h.slice(0, 6)}`;
	return '#000000';
}

/** Parse a live frame object/string into a {@link LiveFrame}, or null if not one. */
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
