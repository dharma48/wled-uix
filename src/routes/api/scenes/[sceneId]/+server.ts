import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getScene, removeScene, updateScene } from '$lib/server/sceneStore';
import type { Scene } from '$lib/scenes/types';

export const GET: RequestHandler = ({ params }) => {
	const scene = getScene(params.sceneId);
	if (!scene) return json({ error: 'not found' }, { status: 404 });
	return json({ scene });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const body = (await request.json().catch(() => null)) as Partial<
		Pick<Scene, 'name' | 'state' | 'ledCount' | 'presetId'>
	> | null;
	const scene = updateScene(params.sceneId, body ?? {});
	if (!scene) return json({ error: 'not found' }, { status: 404 });
	return json({ scene });
};

export const DELETE: RequestHandler = ({ params }) => {
	const ok = removeScene(params.sceneId);
	return json({ ok }, { status: ok ? 200 : 404 });
};
