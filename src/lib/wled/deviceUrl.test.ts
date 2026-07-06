import { describe, expect, it } from 'vitest';
import { wledUiUrl } from './deviceUrl';

describe('wledUiUrl', () => {
	it('builds an http URL for an IP host', () => {
		expect(wledUiUrl('192.168.1.50')).toBe('http://192.168.1.50/');
	});

	it('works with a hostname', () => {
		expect(wledUiUrl('wled-office.local')).toBe('http://wled-office.local/');
	});

	it('returns null for the mock device', () => {
		expect(wledUiUrl('mock')).toBeNull();
	});

	it('returns null for empty/undefined host', () => {
		expect(wledUiUrl('')).toBeNull();
		expect(wledUiUrl(undefined)).toBeNull();
		expect(wledUiUrl(null)).toBeNull();
	});
});
