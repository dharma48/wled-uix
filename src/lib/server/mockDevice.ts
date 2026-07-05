/**
 * In-process fake WLED device used when a device's host is the literal "mock".
 * Serves realistic /json, /json/fxdata and /presets.json responses and accepts POSTs,
 * so the whole UI can be developed and verified without physical hardware.
 *
 * State is per-process singleton; good enough for a demo device.
 */
import type { WledBundle, WledInfo, WledSegment, WledState } from '$lib/wled/types';

/** [effectName, fxdataMetadata] — see fxdata.ts for the metadata format. */
const EFFECTS: [string, string][] = [
	['Solid', ';!;;1;'],
	['Blink', '!,!;!,!;;1;'],
	['Breathe', '!,;!,!;;1;'],
	['Wipe', '!,!;!,!;!;1;'],
	['Colorloop', '!,!;;!;1;sx=128'],
	['Rainbow', '!,!;;!;1;sx=128'],
	['Chase', '!,!;!,!,!;!;1;'],
	['Theater', '!,!;!,!;!;1;'],
	['Twinkle', '!,!;!,!;!;1;'],
	['Sparkle', '!,!;!,!;!;1;'],
	['Fireworks', '!,!;!,!;!;1;'],
	['Fire 2012', '!,!;;!;1;sx=120,ix=64,pal=35'],
	['Colortwinkles', '!,!;;!;1;pal=0'],
	['Plasma', '!,!;;!;1;'],
	['Noise', '!,!;;!;1;'],
	['Meteor', '!,!;!,!;!;1;'],
	['Glitter', '!,!;!,!;!;1;'],
	['Running Dual', '!,!,,,,Smooth;!,!;!;1;'],
	['Dissolve', '!,!,Dissolve rate;!,!;;1;'],
	['Aurora', '!,!;;!;1;pal=50'],
	['Audio Bands', '!,!;!,!;!;1v;'],
	['Gravimeter', '!,!;!,!;!;1f;']
];

const PALETTES: string[] = [
	'Default',
	'* Random Cycle',
	'* Color 1',
	'* Colors 1&2',
	'* Color Gradient',
	'* Colors Only',
	'Party',
	'Cloud',
	'Lava',
	'Ocean',
	'Forest',
	'Rainbow',
	'Rainbow Bands',
	'Sunset',
	'Rivendell',
	'Breeze',
	'Red & Blue',
	'Yellowout',
	'Analogous',
	'Splash',
	'Pastel',
	'Sunset 2',
	'Beach',
	'Vintage',
	'Departure',
	'Landscape',
	'Fire',
	'Icefire',
	'Autumn',
	'Magenta',
	'April Night',
	'C9',
	'Sakura',
	'Aurora'
];

/** id -> preset (WLED /presets.json shape; 0 is reserved/empty). */
interface MockPreset {
	n: string;
	state: Partial<WledState>;
}
function seedPresets(): Record<string, MockPreset> {
	return {
		'1': {
			n: 'Warm White',
			state: { on: true, bri: 200, seg: [{ id: 0, fx: 0, col: [[255, 170, 80]], pal: 0 } as WledSegment] }
		},
		'2': {
			n: 'Christmas',
			state: {
				on: true,
				bri: 220,
				seg: [{ id: 0, fx: 6, col: [[255, 0, 0], [0, 255, 0], [255, 255, 255]], pal: 0 } as WledSegment]
			}
		},
		'3': {
			n: 'Halloween',
			state: { on: true, bri: 180, seg: [{ id: 0, fx: 11, col: [[255, 80, 0]], pal: 8 } as WledSegment] }
		},
		'4': {
			n: 'Ocean Calm',
			state: { on: true, bri: 160, seg: [{ id: 0, fx: 13, col: [[0, 60, 180]], pal: 9 } as WledSegment] }
		}
	};
}

// Anchored on globalThis (like state) so psave/pdel persist across module contexts.
const gpresets = globalThis as unknown as { __wledMockPresets?: Record<string, MockPreset> };
if (!gpresets.__wledMockPresets) gpresets.__wledMockPresets = seedPresets();
const PRESETS = gpresets.__wledMockPresets;

const LED_COUNT = 120;

function initialState(): WledState {
	return {
		on: true,
		bri: 200,
		transition: 7,
		ps: -1,
		pl: -1,
		mainseg: 0,
		seg: [
			{
				id: 0,
				start: 0,
				stop: 40,
				len: 40,
				col: [
					[255, 80, 10],
					[0, 0, 0],
					[0, 0, 0]
				],
				fx: 11,
				sx: 120,
				ix: 90,
				pal: 8,
				sel: true,
				on: true,
				bri: 255
			},
			{
				id: 1,
				start: 40,
				stop: 80,
				len: 40,
				col: [
					[10, 120, 255],
					[0, 0, 0],
					[0, 0, 0]
				],
				fx: 4,
				sx: 128,
				ix: 128,
				pal: 9,
				sel: false,
				on: true,
				bri: 255
			},
			{
				id: 2,
				start: 80,
				stop: 120,
				len: 40,
				col: [
					[120, 20, 200],
					[0, 0, 0],
					[0, 0, 0]
				],
				fx: 0,
				sx: 128,
				ix: 128,
				pal: 0,
				sel: false,
				on: true,
				bri: 255
			}
		]
	};
}

const info: WledInfo = {
	ver: '0.15.0-mock',
	name: 'Demo strip (mock)',
	leds: { count: LED_COUNT, lc: 0x01, rgbw: false, maxseg: 16 },
	fxcount: EFFECTS.length,
	palcount: PALETTES.length,
	ws: 1,
	uptime: 4242,
	mac: 'de:ad:be:ef:00:01',
	ip: '127.0.0.1'
};

// Anchor mutable state on globalThis so the HTTP proxy (SSR module graph) and the WS
// proxy (dev Vite-config context / prod custom server) share ONE instance in-process.
const g = globalThis as unknown as { __wledMockState?: WledState };
if (!g.__wledMockState) g.__wledMockState = initialState();
const state: WledState = g.__wledMockState;

const clamp = (n: number, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Resolve WLED's `"t"` toggle and `~` relative syntaxes for a numeric field. */
function resolveNumeric(current: number, value: unknown, lo = 0, hi = 255): number {
	if (typeof value === 'number') return clamp(value, lo, hi);
	if (typeof value === 'string') {
		if (value === 'r') return clamp(Math.floor(Math.random() * (hi - lo + 1)) + lo, lo, hi);
		if (value.startsWith('~')) {
			const delta = Number(value.slice(1) || '1');
			if (!Number.isNaN(delta)) return clamp(current + delta, lo, hi);
		}
		const n = Number(value);
		if (!Number.isNaN(n)) return clamp(n, lo, hi);
	}
	return current;
}

function applySegmentPatch(target: WledSegment, patch: Record<string, unknown>) {
	// Geometry: start/stop define the LED range (stop exclusive). A segment with
	// stop <= start is treated as deleted by WLED; we keep len in sync for realism.
	if ('start' in patch) target.start = resolveNumeric(target.start, patch.start, 0, LED_COUNT);
	if ('stop' in patch) target.stop = resolveNumeric(target.stop, patch.stop, 0, LED_COUNT);
	if ('start' in patch || 'stop' in patch) target.len = Math.max(0, target.stop - target.start);
	if ('col' in patch && Array.isArray(patch.col)) target.col = patch.col as WledSegment['col'];
	if ('fx' in patch) target.fx = resolveNumeric(target.fx, patch.fx, 0, EFFECTS.length - 1);
	if ('sx' in patch) target.sx = resolveNumeric(target.sx, patch.sx);
	if ('ix' in patch) target.ix = resolveNumeric(target.ix, patch.ix);
	if ('pal' in patch) target.pal = resolveNumeric(target.pal, patch.pal, 0, PALETTES.length - 1);
	for (const k of ['c1', 'c2', 'c3'] as const) {
		if (k in patch) target[k] = resolveNumeric(target[k] ?? 0, patch[k]);
	}
	for (const k of ['o1', 'o2', 'o3'] as const) {
		if (k in patch) target[k] = Boolean(patch[k]);
	}
	if ('on' in patch) target.on = patch.on === 't' ? !target.on : Boolean(patch.on);
	if ('bri' in patch) target.bri = resolveNumeric(target.bri ?? 255, patch.bri);
	if ('rev' in patch) target.rev = Boolean(patch.rev);
	if ('mi' in patch) target.mi = Boolean(patch.mi);
	if ('cct' in patch) target.cct = resolveNumeric(target.cct ?? 127, patch.cct, 0, 255);
	if ('sel' in patch) target.sel = Boolean(patch.sel);
}

function mergeState(body: Record<string, unknown>) {
	// Preset application first (it replaces relevant fields).
	if ('ps' in body) {
		const id = String(body.ps);
		const preset = PRESETS[id];
		if (preset) {
			applyPresetState(preset.state);
			state.ps = Number(id);
		}
	}
	if ('on' in body) state.on = body.on === 't' ? !state.on : Boolean(body.on);
	if ('bri' in body) state.bri = resolveNumeric(state.bri, body.bri);
	if ('transition' in body)
		state.transition = resolveNumeric(state.transition ?? 7, body.transition, 0, 65535);
	if ('mainseg' in body) state.mainseg = Number(body.mainseg);

	if ('seg' in body && Array.isArray(body.seg)) {
		for (const rawSeg of body.seg as Record<string, unknown>[]) {
			const id = typeof rawSeg.id === 'number' ? rawSeg.id : state.mainseg ?? 0;
			if (id < 0 || id >= (info.leds.maxseg ?? 16)) continue;
			let target = state.seg.find((s) => s.id === id);
			if (!target) {
				// WLED creates a segment when you POST an id that isn't currently defined.
				target = {
					id,
					start: 0,
					stop: 0,
					col: [
						[255, 255, 255],
						[0, 0, 0],
						[0, 0, 0]
					],
					fx: 0,
					sx: 128,
					ix: 128,
					pal: 0,
					on: true,
					bri: 255
				};
				state.seg.push(target);
				state.seg.sort((a, b) => a.id - b.id);
			}
			// A manual segment edit clears the "active preset" indicator.
			if (!('ps' in body)) state.ps = -1;
			applySegmentPatch(target, rawSeg);
		}
	}

	// Preset save/delete last, so psave captures the fully-applied state (WLED order).
	if ('psave' in body) {
		const slot = String(body.psave);
		const name = typeof body.n === 'string' && body.n.trim() ? body.n : `Preset ${slot}`;
		PRESETS[slot] = {
			n: name,
			state: {
				on: state.on,
				bri: state.bri,
				seg: state.seg
					.filter((s) => s.stop > s.start)
					.map((s) => ({ ...s, col: s.col.map((c) => [...c]) as WledSegment['col'] }))
			}
		};
	}
	if ('pdel' in body) delete PRESETS[String(body.pdel)];
}

function applyPresetState(ps: Partial<WledState>) {
	if (ps.on !== undefined) state.on = ps.on;
	if (ps.bri !== undefined) state.bri = ps.bri;
	if (ps.seg) {
		for (const segPatch of ps.seg) {
			const target = state.seg.find((s) => s.id === segPatch.id);
			if (target) applySegmentPatch(target, segPatch as unknown as Record<string, unknown>);
		}
	}
}

function bundle(): WledBundle {
	return {
		state,
		info,
		effects: EFFECTS.map((e) => e[0]),
		palettes: PALETTES
	};
}

export interface MockResponse {
	status: number;
	body: unknown;
}

/** Handle a request against the mock's /json/* surface. `subpath` excludes "/json". */
export function mockJson(
	method: string,
	subpath: string,
	body?: Record<string, unknown>
): MockResponse {
	const path = subpath.replace(/^\/+/, '');
	if (method === 'POST') {
		if (body) mergeState(body);
		// WLED returns the state when v:true, else {success:true}.
		return { status: 200, body: body?.v ? state : { success: true } };
	}
	switch (path) {
		case '':
			return { status: 200, body: bundle() };
		case 'state':
			return { status: 200, body: state };
		case 'info':
			return { status: 200, body: info };
		case 'eff':
			return { status: 200, body: EFFECTS.map((e) => e[0]) };
		case 'pal':
			return { status: 200, body: PALETTES };
		case 'fxdata':
			return { status: 200, body: EFFECTS.map((e) => e[1]) };
		default:
			return { status: 404, body: { error: 'not found' } };
	}
}

/** Handle GET /presets.json for the mock. */
export function mockPresets(): MockResponse {
	const out: Record<string, unknown> = { '0': {} };
	for (const [id, p] of Object.entries(PRESETS)) out[id] = { n: p.n };
	return { status: 200, body: out };
}

/** Current state snapshot (used by the WS proxy's mock branch). */
export function mockStateSnapshot(): WledState {
	return state;
}

/**
 * Synthesize a live "peek" frame in WLED's binary format ('L', version 1, then RGB triples)
 * from the current segment layout, so the designer's live preview works — and exercises the
 * real binary decode path — without hardware. Each LED takes its covering segment's primary
 * color, scaled by brightness with a gentle position/time shimmer so it reads as live.
 */
export function mockLiveFrame(): Buffer {
	const count = info.leds.count;
	const t = Date.now() / 1000;
	const buf = Buffer.allocUnsafe(2 + count * 3);
	buf[0] = 0x4c; // 'L'
	buf[1] = 1; // version 1 (1D)
	let pos = 2;
	for (let i = 0; i < count; i++) {
		let r = 0;
		let g = 0;
		let b = 0;
		if (state.on) {
			const seg = state.seg.find(
				(s) => s.on !== false && s.stop > s.start && i >= s.start && i < s.stop
			);
			if (seg) {
				const c = seg.col[0] ?? [0, 0, 0];
				const speed = 0.5 + (seg.sx / 255) * 3;
				const shimmer = 0.55 + 0.45 * Math.sin(i * 0.35 - t * speed);
				const scale = (state.bri / 255) * ((seg.bri ?? 255) / 255) * shimmer;
				r = c[0] * scale;
				g = c[1] * scale;
				b = c[2] * scale;
			}
		}
		buf[pos++] = clamp(r);
		buf[pos++] = clamp(g);
		buf[pos++] = clamp(b);
	}
	return buf;
}
