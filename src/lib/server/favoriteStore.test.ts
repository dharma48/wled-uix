import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Favorites } from '$lib/favorites/types';

// Point the store at an isolated temp dir before importing it (it reads DATA_DIR at load time).
let store: typeof import('./favoriteStore');
let dir: string;

beforeAll(async () => {
	dir = mkdtempSync(join(tmpdir(), 'wled-fav-'));
	process.env.DATA_DIR = dir;
	store = await import('./favoriteStore');
});

function onDisk(): Favorites {
	return JSON.parse(readFileSync(join(dir, 'favorites.json'), 'utf8')) as Favorites;
}

describe('favoriteStore', () => {
	it('starts empty', () => {
		expect(store.getFavorites()).toEqual({ effects: [], palettes: [] });
	});

	it('adds and removes favorites by kind, and persists', () => {
		expect(store.setFavorite('effect', 'Rainbow', true).effects).toEqual(['Rainbow']);
		store.setFavorite('palette', 'Ocean', true);

		const fav = store.getFavorites();
		expect(fav).toEqual({ effects: ['Rainbow'], palettes: ['Ocean'] });
		expect(onDisk()).toEqual(fav);

		expect(store.setFavorite('effect', 'Rainbow', false).effects).toEqual([]);
		expect(store.getFavorites().palettes).toEqual(['Ocean']);
	});

	it('dedupes and trims names', () => {
		store.setFavorite('effect', 'Solid', true);
		store.setFavorite('effect', '  Solid  ', true);
		expect(store.getFavorites().effects).toEqual(['Solid']);
	});
});
