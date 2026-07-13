/**
 * Reactive, globally-shared set of favorited effects and palettes, backed by the
 * /api/favorites endpoint. Favorites are keyed by name so they're portable across
 * devices and firmware versions. Toggling is optimistic and reconciled from the server.
 */
import { browser } from '$app/environment';
import type { FavoriteKind, Favorites } from '$lib/favorites/types';

const JSON_HEADERS = { 'content-type': 'application/json' };

class FavoritesStore {
	effects = $state<string[]>([]);
	palettes = $state<string[]>([]);
	loaded = $state(false);

	async load() {
		if (!browser || this.loaded) return;
		try {
			const res = await fetch('/api/favorites');
			const data = (await res.json()) as { favorites?: Favorites };
			this.apply(data.favorites);
		} catch {
			// Leave lists empty; favorites are non-critical.
		} finally {
			this.loaded = true;
		}
	}

	isFavorite(kind: FavoriteKind, name: string): boolean {
		return (kind === 'effect' ? this.effects : this.palettes).includes(name);
	}

	async toggle(kind: FavoriteKind, name: string) {
		const favored = !this.isFavorite(kind, name);
		// Optimistic local update.
		const list = kind === 'effect' ? this.effects : this.palettes;
		const next = favored ? [...list, name] : list.filter((n) => n !== name);
		if (kind === 'effect') this.effects = next;
		else this.palettes = next;

		try {
			const res = await fetch('/api/favorites', {
				method: 'PUT',
				headers: JSON_HEADERS,
				body: JSON.stringify({ kind, name, favored })
			});
			if (!res.ok) throw new Error('request failed');
			const data = (await res.json()) as { favorites?: Favorites };
			this.apply(data.favorites);
		} catch {
			// Revert the optimistic change on failure.
			if (kind === 'effect') this.effects = list;
			else this.palettes = list;
		}
	}

	private apply(favorites: Favorites | undefined) {
		this.effects = favorites?.effects ?? [];
		this.palettes = favorites?.palettes ?? [];
	}
}

export const favorites = new FavoritesStore();
