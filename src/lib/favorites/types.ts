export type FavoriteKind = 'effect' | 'palette';

/**
 * User-favorited effects and palettes, keyed by name (not numeric index).
 * WLED effect/palette indices vary across devices and firmware, but names are
 * stable and portable, so favorites are stored by name and shared globally.
 */
export interface Favorites {
	effects: string[];
	palettes: string[];
}
