import { describe, expect, it } from 'vitest';
import { descriptionFor } from './effectDescriptions';

describe('descriptionFor', () => {
	it('returns the description for a known effect', () => {
		expect(descriptionFor('Solid')).toBe('Solid primary color on all LEDs');
	});

	it('matches case-insensitively and ignores surrounding/collapsible whitespace', () => {
		expect(descriptionFor('  solid  ')).toBe('Solid primary color on all LEDs');
		expect(descriptionFor('FIRE 2012')).toBe(descriptionFor('Fire 2012'));
		expect(descriptionFor('Fire\t2012')).toBe(descriptionFor('Fire 2012'));
	});

	it('returns undefined for unknown names without throwing', () => {
		// Reserved "RSVD" slots are filtered out by EffectPicker before lookup, so a stray
		// description in the source data for that name is harmless.
		expect(descriptionFor('Totally Made Up Effect')).toBeUndefined();
		expect(descriptionFor('')).toBeUndefined();
	});
});
