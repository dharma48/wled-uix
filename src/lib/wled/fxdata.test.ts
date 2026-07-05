import { describe, expect, it } from 'vitest';
import { parseFxMeta } from './fxdata';

describe('parseFxMeta', () => {
	it('parses speed + intensity with default labels', () => {
		const m = parseFxMeta('!,!;;!;1;');
		expect(m.sliders.map((s) => s.key)).toEqual(['sx', 'ix']);
		expect(m.sliders[0].label).toBe('Speed');
		expect(m.sliders[1].label).toBe('Intensity');
		expect(m.usesPalette).toBe(true);
		expect(m.is1D).toBe(true);
		expect(m.colors).toEqual([]);
	});

	it('treats empty params as disabled controls, keeping later positions', () => {
		// ",,Custom" -> sx disabled, ix disabled, c1 enabled with custom label
		const m = parseFxMeta(',,Custom;!;;1;');
		expect(m.sliders.map((s) => s.key)).toEqual(['c1']);
		expect(m.sliders[0].label).toBe('Custom');
	});

	it('parses a custom slider label at the c1 position', () => {
		const m = parseFxMeta('!,!,Dissolve rate;!,!;;1;');
		expect(m.sliders.map((s) => [s.key, s.label])).toEqual([
			['sx', 'Speed'],
			['ix', 'Intensity'],
			['c1', 'Dissolve rate']
		]);
		expect(m.colors.map((c) => c.index)).toEqual([0, 1]);
	});

	it('parses a checkbox at the o1 position', () => {
		const m = parseFxMeta('!,!,,,,Smooth;!,!;!;1;');
		expect(m.sliders.map((s) => s.key)).toEqual(['sx', 'ix']);
		expect(m.checkboxes.map((c) => [c.key, c.label])).toEqual([['o1', 'Smooth']]);
	});

	it('detects audio-reactive flags', () => {
		expect(parseFxMeta('!,!;!,!;!;1v;').volumeReactive).toBe(true);
		expect(parseFxMeta('!,!;!,!;!;1f;').frequencyReactive).toBe(true);
		expect(parseFxMeta('!,!;;!;2;').is2D).toBe(true);
	});

	it('parses defaults into numbers', () => {
		const m = parseFxMeta('!,!;;!;1;sx=120,ix=64,pal=35');
		expect(m.defaults).toEqual({ sx: 120, ix: 64, pal: 35 });
	});

	it('handles solid-style metadata with no sliders and one color', () => {
		const m = parseFxMeta(';!;;1;');
		expect(m.sliders).toEqual([]);
		expect(m.colors.map((c) => c.index)).toEqual([0]);
		expect(m.usesPalette).toBe(false);
	});

	it('is defensive against undefined/empty input', () => {
		const m = parseFxMeta(undefined);
		expect(m.sliders).toEqual([]);
		expect(m.colors).toEqual([]);
		expect(m.usesPalette).toBe(false);
	});
});
