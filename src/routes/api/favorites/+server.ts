import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFavorites, setFavorite } from '$lib/server/favoriteStore';
import type { FavoriteKind } from '$lib/favorites/types';

export const GET: RequestHandler = () => {
	return json({ favorites: getFavorites() });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as {
		kind?: FavoriteKind;
		name?: string;
		favored?: boolean;
	} | null;
	if (
		(body?.kind !== 'effect' && body?.kind !== 'palette') ||
		typeof body.name !== 'string' ||
		!body.name.trim() ||
		typeof body.favored !== 'boolean'
	) {
		return json({ error: 'kind, name and favored are required' }, { status: 400 });
	}
	return json({ favorites: setFavorite(body.kind, body.name, body.favored) });
};
