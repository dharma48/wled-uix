import { describe, expect, it } from 'vitest';
import { buildExport, parseImport, toPortable } from './portable';
import type { Scene } from './types';

const scene: Scene = {
	id: 'abc',
	deviceId: 'dev1',
	name: 'Xmas',
	createdAt: 1,
	updatedAt: 2,
	ledCount: 120,
	presetId: 5,
	state: { on: true, bri: 200, seg: [{ id: 0, start: 0, stop: 60, col: [[255, 0, 0]], fx: 0, sx: 128, ix: 128, pal: 0 }] }
};

describe('toPortable / buildExport', () => {
	it('drops install-specific fields', () => {
		const p = toPortable(scene);
		expect(p).toEqual({ name: 'Xmas', ledCount: 120, state: scene.state });
		expect(p).not.toHaveProperty('id');
		expect(p).not.toHaveProperty('presetId');
	});

	it('wraps scenes in a versioned envelope', () => {
		const env = buildExport([scene]);
		expect(env.app).toBe('wled-uix');
		expect(env.version).toBe(1);
		expect(env.scenes).toHaveLength(1);
	});
});

describe('parseImport', () => {
	it('parses our export envelope', () => {
		const raw = JSON.stringify(buildExport([scene]));
		const out = parseImport(raw);
		expect(out).toHaveLength(1);
		expect(out[0].name).toBe('Xmas');
		expect(out[0].ledCount).toBe(120);
	});

	it('parses a bare array of scenes', () => {
		const raw = JSON.stringify([toPortable(scene), toPortable({ ...scene, name: 'Two' })]);
		expect(parseImport(raw)).toHaveLength(2);
	});

	it('parses a single scene object', () => {
		expect(parseImport(JSON.stringify(toPortable(scene)))).toHaveLength(1);
	});

	it('derives ledCount from segments when missing', () => {
		const raw = JSON.stringify({ name: 'NoCount', state: scene.state });
		expect(parseImport(raw)[0].ledCount).toBe(60);
	});

	it('defaults a missing name', () => {
		const raw = JSON.stringify({ state: scene.state });
		expect(parseImport(raw)[0].name).toBe('Imported scene');
	});

	it('skips invalid entries but keeps valid ones', () => {
		const raw = JSON.stringify([{ nope: true }, toPortable(scene)]);
		expect(parseImport(raw)).toHaveLength(1);
	});

	it('throws on non-JSON', () => {
		expect(() => parseImport('not json')).toThrow('Not valid JSON');
	});

	it('throws when there are no valid scenes', () => {
		expect(() => parseImport(JSON.stringify([{ nope: true }]))).toThrow('No valid scenes');
	});
});
