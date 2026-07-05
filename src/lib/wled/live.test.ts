import { describe, expect, it } from 'vitest';
import { isLiveFrameText, parseLiveBinary, parseLiveFrame } from './live';

describe('parseLiveBinary', () => {
	it('decodes a 1D peek packet (L,1 + RGB triples)', () => {
		const buf = new Uint8Array([0x4c, 1, 0xff, 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00, 0xff]);
		const f = parseLiveBinary(buf);
		expect(f).not.toBeNull();
		expect(f!.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
		expect(f!.n).toBe(1);
		expect(f!.w).toBeUndefined();
	});

	it('decodes a 2D peek packet with width/height header', () => {
		const buf = new Uint8Array([0x4c, 2, 16, 8, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60]);
		const f = parseLiveBinary(buf);
		expect(f!.w).toBe(16);
		expect(f!.h).toBe(8);
		expect(f!.colors).toEqual(['#102030', '#405060']);
	});

	it('ignores a trailing partial triple', () => {
		const buf = new Uint8Array([0x4c, 1, 0xaa, 0xbb, 0xcc, 0xdd]); // 1 full + 1 leftover byte
		expect(parseLiveBinary(buf)!.colors).toEqual(['#aabbcc']);
	});

	it('accepts an ArrayBuffer as well as a Uint8Array', () => {
		const u8 = new Uint8Array([0x4c, 1, 0x01, 0x02, 0x03]);
		expect(parseLiveBinary(u8.buffer)!.colors).toEqual(['#010203']);
	});

	it('rejects non-peek buffers', () => {
		expect(parseLiveBinary(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
		expect(parseLiveBinary(new Uint8Array([0x4c]))).toBeNull();
	});
});

describe('isLiveFrameText', () => {
	it('matches a JSON live frame but NOT a state push containing info.leds', () => {
		expect(isLiveFrameText('{"leds":["FF0000"],"n":1}')).toBe(true);
		// State frames embed "leds" inside info — must not be treated as live.
		expect(isLiveFrameText('{"state":{"on":true},"info":{"leds":{"count":30}}}')).toBe(false);
	});
});

describe('parseLiveFrame (JSON legacy)', () => {
	it('parses hex colors and default n', () => {
		const f = parseLiveFrame('{"leds":["FF0000","00FF00"],"n":2}');
		expect(f!.colors).toEqual(['#ff0000', '#00ff00']);
		expect(f!.n).toBe(2);
	});

	it('returns null for non-live / malformed frames', () => {
		expect(parseLiveFrame('{"state":{"on":true}}')).toBeNull();
		expect(parseLiveFrame('not json')).toBeNull();
	});
});
