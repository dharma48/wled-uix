import type { RequestHandler } from './$types';
import { proxyPresets } from '$lib/server/proxy';

export const GET: RequestHandler = ({ params }) => proxyPresets(params.id);
