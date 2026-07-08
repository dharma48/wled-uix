import { describe, expect, it } from 'vitest';
import { paletteGradient } from './palettes';
import type { WledColor } from './types';

const RAINBOW = 'linear-gradient(90deg, #ff0000';

describe('paletteGradient', () => {
	it('renders a named palette from its hand-authored stops', () => {
		expect(paletteGradient('Ocean')).toContain('linear-gradient(90deg, #001b4d');
	});

	it('falls back to a rainbow for unknown palette names', () => {
		expect(paletteGradient('Totally Made Up')).toContain(RAINBOW);
	});

	describe('Default palette (id 0)', () => {
		// WLED's Default palette colors the effect from the segment's own slots, so the
		// preview must follow the segment colors rather than a generic rainbow.
		it('uses the primary color when only one slot is lit', () => {
			const col: WledColor[] = [
				[255, 100, 0],
				[0, 0, 0],
				[0, 0, 0]
			];
			expect(paletteGradient('Default', col)).toBe('rgb(255, 100, 0)');
		});

		it('gradients across the lit color slots', () => {
			const col: WledColor[] = [
				[255, 100, 0],
				[0, 0, 200],
				[0, 0, 0]
			];
			expect(paletteGradient('Default', col)).toBe(
				'linear-gradient(90deg, rgb(255, 100, 0), rgb(0, 0, 200))'
			);
		});

		it('falls back to the primary color (or gray) when no slot is lit', () => {
			expect(paletteGradient('Default')).toBe('#888');
			expect(paletteGradient('Default', [[0, 0, 0]])).toBe('rgb(0, 0, 0)');
		});
	});
});
