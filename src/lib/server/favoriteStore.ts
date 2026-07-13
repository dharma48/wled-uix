/**
 * Persisted store of favorited effects and palettes, mirroring sceneStore.ts: a JSON
 * file under DATA_DIR, with the cache anchored on globalThis so every module context
 * shares one instance. Favorites are global (not device-scoped) and keyed by name.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { FavoriteKind, Favorites } from '$lib/favorites/types';
import { createLogger } from '../../../logger.js';

const log = createLogger('favoriteStore');

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data');
const FILE = join(DATA_DIR, 'favorites.json');

const gstore = globalThis as unknown as { __wledFavoriteStore?: Favorites };

function normalize(raw: Partial<Favorites> | null | undefined): Favorites {
	return {
		effects: Array.isArray(raw?.effects) ? raw.effects : [],
		palettes: Array.isArray(raw?.palettes) ? raw.palettes : []
	};
}

function load(): Favorites {
	if (gstore.__wledFavoriteStore) return gstore.__wledFavoriteStore;
	if (existsSync(FILE)) {
		try {
			const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<Favorites>;
			gstore.__wledFavoriteStore = normalize(parsed);
		} catch (err) {
			log.warn(`failed to parse ${FILE}, starting empty: ${(err as Error).message}`);
			gstore.__wledFavoriteStore = normalize(null);
		}
	} else {
		gstore.__wledFavoriteStore = normalize(null);
	}
	return gstore.__wledFavoriteStore;
}

function persist() {
	const data = gstore.__wledFavoriteStore;
	if (!data) return;
	mkdirSync(dirname(FILE), { recursive: true });
	writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

/** Return a copy of the current favorites. */
export function getFavorites(): Favorites {
	const data = load();
	return { effects: [...data.effects], palettes: [...data.palettes] };
}

/** Add or remove a name from the effect/palette favorites, and return the updated set. */
export function setFavorite(kind: FavoriteKind, name: string, favored: boolean): Favorites {
	const data = load();
	const key = kind === 'effect' ? 'effects' : 'palettes';
	const trimmed = name.trim();
	const without = data[key].filter((n) => n !== trimmed);
	data[key] = favored ? [...without, trimmed] : without;
	persist();
	return getFavorites();
}
