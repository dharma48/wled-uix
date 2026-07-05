import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { discoverWled } from '$lib/server/discovery';

export const GET: RequestHandler = async () => {
	const devices = await discoverWled(3000);
	return json({ devices });
};
