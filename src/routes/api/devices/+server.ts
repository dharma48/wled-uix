import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addDevice, listDevices } from '$lib/server/deviceStore';

export const GET: RequestHandler = () => json({ devices: listDevices() });

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as { name?: string; host?: string } | null;
	if (!body?.host?.trim()) return json({ error: 'host is required' }, { status: 400 });
	const device = addDevice({ name: body.name ?? '', host: body.host });
	return json({ device }, { status: 201 });
};
