import type { RequestHandler } from './$types';
import { proxyJson } from '$lib/server/proxy';

export const GET: RequestHandler = ({ params }) => proxyJson(params.id, params.path, 'GET', undefined);

export const POST: RequestHandler = async ({ params, request }) => {
	const body = (await request.json().catch(() => undefined)) as Record<string, unknown> | undefined;
	return proxyJson(params.id, params.path, 'POST', body);
};
