/**
 * Types for the WLED JSON API.
 * Reference: https://kno.wled.ge/interfaces/json-api/
 * Only the fields this app reads/writes are modelled; the API has more.
 */

export type RGB = [number, number, number];
export type RGBW = [number, number, number, number];
export type WledColor = RGB | RGBW;

/** A single segment of the LED strip. */
export interface WledSegment {
	id: number;
	/** First LED index (inclusive). */
	start: number;
	/** Last LED index (exclusive). */
	stop: number;
	/** Segment length (derived; present in responses). */
	len?: number;
	/** Up to 3 colors: primary, secondary, tertiary. */
	col: WledColor[];
	/** Effect id. */
	fx: number;
	/** Effect speed 0-255. */
	sx: number;
	/** Effect intensity 0-255. */
	ix: number;
	/** Custom sliders (effect-dependent). */
	c1?: number;
	c2?: number;
	c3?: number;
	/** Custom checkboxes (effect-dependent). */
	o1?: boolean;
	o2?: boolean;
	o3?: boolean;
	/** Palette id. */
	pal: number;
	/** Selected for grouped API updates. */
	sel?: boolean;
	/** Reverse direction. */
	rev?: boolean;
	/** Segment power. */
	on?: boolean;
	/** Segment brightness 0-255. */
	bri?: number;
	/** Mirror. */
	mi?: boolean;
	/** Color temperature: 0-255 relative or 1900-10091 Kelvin. */
	cct?: number;
	/** LED grouping. */
	grp?: number;
	/** LED spacing. */
	spc?: number;
}

export interface NightlightState {
	on: boolean;
	dur: number;
	mode: number;
	tbri: number;
}

/** The mutable light state (`/json/state`). */
export interface WledState {
	on: boolean;
	/** Brightness 0-255. */
	bri: number;
	/** Crossfade duration in 100ms units. */
	transition?: number;
	/** Active preset id (-1 = none). */
	ps?: number;
	/** Active playlist id (-1 = none). */
	pl?: number;
	nl?: NightlightState;
	/** Index of the main segment. */
	mainseg?: number;
	seg: WledSegment[];
}

export interface WledLedInfo {
	count: number;
	/** Global light-capability bitfield (bit0 RGB, bit1 White, bit2 CCT). */
	lc?: number;
	/** Per-segment light-capability bitfields. */
	seglc?: number[];
	rgbw?: boolean;
	/** Matrix width/height when the device is 2D. */
	maxseg?: number;
}

/** Read-only device info (`/json/info`). */
export interface WledInfo {
	ver: string;
	name: string;
	leds: WledLedInfo;
	fxcount: number;
	palcount: number;
	/** Number of connected websocket clients, -1 if unsupported. */
	ws?: number;
	uptime?: number;
	mac?: string;
	ip?: string;
	/** 2D matrix descriptor when present. */
	udpport?: number;
}

/** The bundle returned by `GET /json`. */
export interface WledBundle {
	state: WledState;
	info: WledInfo;
	effects: string[];
	palettes: string[];
}

/** Light-capability bit flags. */
export const LC_RGB = 0x01;
export const LC_WHITE = 0x02;
export const LC_CCT = 0x04;

export function hasCapability(bits: number | undefined, flag: number): boolean {
	return ((bits ?? LC_RGB) & flag) !== 0;
}
