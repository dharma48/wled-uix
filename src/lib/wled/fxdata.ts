/**
 * Parser for WLED effect metadata (`/json/fxdata`).
 *
 * Format: `<params>;<colors>;<palette>;<flags>;<defaults>`
 *  - params:  up to 8 comma positions mapping to sx, ix, c1, c2, c3, o1, o2, o3.
 *             "!" = default label, "" = control disabled, other text = custom label.
 *  - colors:  up to 3 comma positions (primary, background, tertiary). Same "!"/"" rules.
 *  - palette: non-empty (usually "!") = palette selector shown, "" = no palette.
 *  - flags:   characters — '1' 1D-optimized, '2' 2D-only, 'v' volume-reactive,
 *             'f' frequency-reactive.
 *  - defaults: comma-separated `key=value` applied when the effect is selected.
 *
 * Reference: https://kno.wled.ge/interfaces/json-api/
 */

export type SliderKey = 'sx' | 'ix' | 'c1' | 'c2' | 'c3';
export type CheckboxKey = 'o1' | 'o2' | 'o3';

export interface SliderControl {
	key: SliderKey;
	label: string;
}
export interface CheckboxControl {
	key: CheckboxKey;
	label: string;
}
export interface ColorSlot {
	index: number;
	label: string;
}

export interface EffectMeta {
	sliders: SliderControl[];
	checkboxes: CheckboxControl[];
	colors: ColorSlot[];
	usesPalette: boolean;
	is1D: boolean;
	is2D: boolean;
	volumeReactive: boolean;
	frequencyReactive: boolean;
	defaults: Partial<Record<string, number>>;
}

const SLIDER_KEYS: SliderKey[] = ['sx', 'ix', 'c1', 'c2', 'c3'];
const CHECKBOX_KEYS: CheckboxKey[] = ['o1', 'o2', 'o3'];
const DEFAULT_SLIDER_LABELS: Record<SliderKey, string> = {
	sx: 'Speed',
	ix: 'Intensity',
	c1: 'Custom 1',
	c2: 'Custom 2',
	c3: 'Custom 3'
};
const DEFAULT_CHECKBOX_LABELS: Record<CheckboxKey, string> = {
	o1: 'Option 1',
	o2: 'Option 2',
	o3: 'Option 3'
};
const DEFAULT_COLOR_LABELS = ['Primary', 'Background', 'Tertiary'];

function label(raw: string, fallback: string): string {
	const t = raw.trim();
	if (t === '!' || t === '') return fallback;
	return t;
}

/** Parse a single effect's metadata string into an {@link EffectMeta}. */
export function parseFxMeta(meta: string | undefined | null): EffectMeta {
	const sections = (meta ?? '').split(';');
	const [paramsRaw = '', colorsRaw = '', paletteRaw = '', flagsRaw = '', defaultsRaw = ''] =
		sections;

	const sliders: SliderControl[] = [];
	const checkboxes: CheckboxControl[] = [];

	const params = paramsRaw.split(',');
	for (let i = 0; i < params.length; i++) {
		const entry = params[i];
		if (entry === undefined || entry.trim() === '') continue; // disabled control
		if (i < SLIDER_KEYS.length) {
			const key = SLIDER_KEYS[i];
			sliders.push({ key, label: label(entry, DEFAULT_SLIDER_LABELS[key]) });
		} else {
			const key = CHECKBOX_KEYS[i - SLIDER_KEYS.length];
			if (key) checkboxes.push({ key, label: label(entry, DEFAULT_CHECKBOX_LABELS[key]) });
		}
	}

	const colors: ColorSlot[] = [];
	if (colorsRaw.trim() !== '') {
		const cols = colorsRaw.split(',');
		for (let i = 0; i < cols.length && i < 3; i++) {
			if (cols[i].trim() === '') continue;
			colors.push({ index: i, label: label(cols[i], DEFAULT_COLOR_LABELS[i]) });
		}
	}

	const usesPalette = paletteRaw.trim() !== '';

	const flags = flagsRaw;
	const is1D = flags.includes('1');
	const is2D = flags.includes('2');
	const volumeReactive = flags.includes('v');
	const frequencyReactive = flags.includes('f');

	const defaults: Partial<Record<string, number>> = {};
	if (defaultsRaw.trim() !== '') {
		for (const pair of defaultsRaw.split(',')) {
			const [k, v] = pair.split('=');
			if (k && v !== undefined) {
				const n = Number(v);
				if (!Number.isNaN(n)) defaults[k.trim()] = n;
			}
		}
	}

	return {
		sliders,
		checkboxes,
		colors,
		usesPalette,
		is1D,
		is2D,
		volumeReactive,
		frequencyReactive,
		defaults
	};
}

/** Parse the full `/json/fxdata` array (index === effect id). */
export function parseFxDataArray(fxdata: string[]): EffectMeta[] {
	return fxdata.map(parseFxMeta);
}
