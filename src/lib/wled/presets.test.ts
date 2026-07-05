import { describe, expect, it } from 'vitest';
import { nextFreePreset } from './presets';

describe('nextFreePreset', () => {
	it('returns 1 when nothing is used', () => {
		expect(nextFreePreset([])).toBe(1);
	});

	it('returns the lowest gap', () => {
		expect(nextFreePreset([1, 2, 4])).toBe(3);
		expect(nextFreePreset([2, 3, 4])).toBe(1);
	});

	it('returns the next slot after a contiguous run', () => {
		expect(nextFreePreset([1, 2, 3])).toBe(4);
	});

	it('ignores duplicates and order', () => {
		expect(nextFreePreset([3, 1, 1, 2])).toBe(4);
	});

	it('returns null when all 250 slots are taken', () => {
		const all = Array.from({ length: 250 }, (_, i) => i + 1);
		expect(nextFreePreset(all)).toBeNull();
	});
});
