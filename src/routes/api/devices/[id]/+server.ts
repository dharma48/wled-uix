import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDevice, removeDevice, updateDevice } from '$lib/server/deviceStore';

export const GET: RequestHandler = ({ params }) => {
	const device = getDevice(params.id);
	if (!device) return json({ error: 'not found' }, { status: 404 });
	return json({ device });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const body = (await request.json().catch(() => null)) as
		| { name?: string; host?: string }
		| null;
	const device = updateDevice(params.id, body ?? {});
	if (!device) return json({ error: 'not found' }, { status: 404 });
	return json({ device });
};

export const DELETE: RequestHandler = ({ params }) => {
	const ok = removeDevice(params.id);
	return json({ ok }, { status: ok ? 200 : 404 });
};
