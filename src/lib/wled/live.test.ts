import { describe, expect, it } from 'vitest';
import { isLiveFrame, parseLiveFrame } from './live';

describe('parseLiveFrame', () => {
	it('parses hex colors and default n', () => {
		const f = parseLiveFrame('{"leds":["FF0000","00FF00","0000FF"],"n":1}');
		expect(f).not.toBeNull();
		expect(f!.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
		expect(f!.n).toBe(1);
		expect(f!.w).toBeUndefined();
	});

	it('carries the sampling interval', () => {
		const f = parseLiveFrame('{"leds":["ABCDEF"],"n":4}');
		expect(f!.n).toBe(4);
	});

	it('parses 2D matrix width/height', () => {
		const f = parseLiveFrame('{"leds":["FFFFFF","000000"],"n":1,"w":16,"h":8}');
		expect(f!.w).toBe(16);
		expect(f!.h).toBe(8);
	});

	it('truncates RGBW hex to the RGB portion', () => {
		const f = parseLiveFrame({ leds: ['FF000080'], n: 1 });
		expect(f!.colors).toEqual(['#ff0000']);
	});

	it('defaults n to 1 when absent or invalid', () => {
		expect(parseLiveFrame({ leds: ['FF0000'] })!.n).toBe(1);
		expect(parseLiveFrame({ leds: ['FF0000'], n: 0 })!.n).toBe(1);
	});

	it('returns null for non-live / malformed frames', () => {
		expect(parseLiveFrame('{"state":{"on":true}}')).toBeNull();
		expect(parseLiveFrame('not json')).toBeNull();
		expect(parseLiveFrame({ leds: 'nope' as unknown as unknown[] })).toBeNull();
	});

	it('coerces bad color entries to black rather than throwing', () => {
		const f = parseLiveFrame({ leds: ['FF0000', 42, null, 'xyz'] });
		expect(f!.colors).toEqual(['#ff0000', '#000000', '#000000', '#000000']);
	});
});

describe('isLiveFrame', () => {
	it('detects live frames cheaply', () => {
		expect(isLiveFrame('{"leds":["FF0000"],"n":1}')).toBe(true);
		expect(isLiveFrame('{"state":{"on":true},"info":{}}')).toBe(false);
	});
});
