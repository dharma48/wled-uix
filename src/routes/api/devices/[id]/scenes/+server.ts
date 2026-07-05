import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDevice } from '$lib/server/deviceStore';
import { addScene, listScenes } from '$lib/server/sceneStore';
import type { SceneCreate } from '$lib/scenes/types';

export const GET: RequestHandler = ({ params }) => {
	if (!getDevice(params.id)) return json({ error: 'unknown device' }, { status: 404 });
	return json({ scenes: listScenes(params.id) });
};

export const POST: RequestHandler = async ({ params, request }) => {
	if (!getDevice(params.id)) return json({ error: 'unknown device' }, { status: 404 });
	const body = (await request.json().catch(() => null)) as SceneCreate | null;
	if (!body?.name?.trim() || !body.state || !Array.isArray(body.state.seg)) {
		return json({ error: 'name and state are required' }, { status: 400 });
	}
	const scene = addScene(params.id, {
		name: body.name,
		ledCount: body.ledCount ?? 0,
		state: body.state
	});
	return json({ scene }, { status: 201 });
};
