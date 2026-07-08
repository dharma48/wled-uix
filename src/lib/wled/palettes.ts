/**
 * CSS gradient previews for WLED palettes.
 *
 * WLED can expose exact palette data via /json/palx, but for a lightweight milestone-1
 * preview we map the common built-in palette names to hand-authored gradient stops and
 * fall back to a neutral rainbow for unknown names. The "special" palettes (ids 0-5)
 * derive from the segment's own colors, so we render those from live color data.
 */
import type { WledColor } from './types';

const G: Record<string, string[]> = {
	Party: ['#ff0080', '#ff8c00', '#ffe600', '#00c8ff', '#a000ff'],
	Cloud: ['#0b2a6b', '#2f6fd0', '#9fc7ff', '#ffffff', '#9fc7ff'],
	Lava: ['#000000', '#7a0000', '#d21e00', '#ff8c00', '#ffe600'],
	Ocean: ['#001b4d', '#00468c', '#0090c8', '#28d0d0', '#c8ffff'],
	Forest: ['#052905', '#0f6b1e', '#3fae2f', '#a6d854', '#e8ffb0'],
	Rainbow: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'],
	'Rainbow Bands': ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'],
	Sunset: ['#2b1055', '#7f2b6e', '#e0533d', '#ffb347', '#ffe9a8'],
	'Sunset 2': ['#3a1c71', '#d76d77', '#ffaf7b', '#ffe9a8'],
	Rivendell: ['#1a3a2a', '#3f6b52', '#8fae8f', '#d8e6c8'],
	Breeze: ['#0b3d5c', '#2f8fb0', '#a6e3e9', '#ffffff'],
	'Red & Blue': ['#ff0000', '#7a0060', '#0000ff'],
	Yellowout: ['#ffe600', '#ff8c00', '#000000'],
	Analogous: ['#ff0040', '#ff6a00', '#ffd000'],
	Splash: ['#00c8ff', '#a000ff', '#ff0080', '#ffe600'],
	Pastel: ['#ffd1dc', '#c1f0d1', '#c9d8ff', '#fff3c4'],
	Beach: ['#0090c8', '#7ecece', '#f7e9c0', '#e6c68a'],
	Vintage: ['#5c3a21', '#a06a3f', '#d9b382', '#f2e6c9'],
	Departure: ['#3a1f0b', '#8c5a2b', '#37d67a', '#a6ffcf'],
	Landscape: ['#003b73', '#2a9d8f', '#e9c46a', '#f4a261'],
	Fire: ['#000000', '#5a0000', '#c81e00', '#ff7a00', '#ffe600'],
	Icefire: ['#00204a', '#2f6fd0', '#ffffff', '#ff7a00', '#ffe600'],
	Autumn: ['#3a1a00', '#8c3b00', '#d2691e', '#e9a13b', '#f4d06f'],
	Magenta: ['#2a0033', '#7a0080', '#ff00d0', '#ffa6f0'],
	'April Night': ['#001636', '#00c8ff', '#a000ff', '#ff0080'],
	C9: ['#ff2d2d', '#2dff2d', '#2d6bff', '#ffd02d', '#ff8c2d'],
	Sakura: ['#ffd1dc', '#ff9fb2', '#ff6f91', '#c9184a'],
	Aurora: ['#001636', '#0f6b52', '#37d67a', '#00c8ff', '#a000ff']
};

const FALLBACK = G.Rainbow;

function toGradient(stops: string[]): string {
	const n = stops.length;
	const parts = stops.map((c, i) => `${c} ${((i / (n - 1)) * 100).toFixed(1)}%`);
	return `linear-gradient(90deg, ${parts.join(', ')})`;
}

const rgb = (c: WledColor | undefined, fb = '#333') =>
	c ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : fb;

const isLit = (c: WledColor | undefined): c is WledColor => !!c && (c[0] > 0 || c[1] > 0 || c[2] > 0);

/**
 * Preview the WLED "Default" palette from the segment's own colors. Palette id 0 tells WLED
 * to color the effect from the segment's slots rather than a gradient palette, so a generic
 * rainbow misrepresents it — and since most real-world scenes leave the palette at Default,
 * that made nearly every thumbnail a rainbow. Render the lit color slots instead, falling
 * back to the rainbow only when the segment carries no color data.
 */
function defaultPalette(segColors?: WledColor[]): string {
	const lit = (segColors ?? []).filter(isLit);
	if (lit.length === 0) return toGradient(FALLBACK);
	if (lit.length === 1) return rgb(lit[0]);
	return `linear-gradient(90deg, ${lit.map((c) => rgb(c)).join(', ')})`;
}

/**
 * Return a CSS `background` value previewing a palette by name.
 * `segColors` supplies the live primary/secondary/tertiary for the "special" palettes.
 */
export function paletteGradient(name: string, segColors?: WledColor[]): string {
	const primary = rgb(segColors?.[0], '#888');
	const secondary = rgb(segColors?.[1], '#222');
	const tertiary = rgb(segColors?.[2], '#000');

	switch (name) {
		case 'Default':
			return defaultPalette(segColors);
		case '* Random Cycle':
			return toGradient(['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']);
		case '* Color 1':
			return primary;
		case '* Colors 1&2':
			return `linear-gradient(90deg, ${primary}, ${secondary})`;
		case '* Color Gradient':
			return `linear-gradient(90deg, ${primary}, ${secondary}, ${tertiary})`;
		case '* Colors Only':
			return `linear-gradient(90deg, ${primary} 0 33.3%, ${secondary} 33.3% 66.6%, ${tertiary} 66.6% 100%)`;
	}
	return toGradient(G[name] ?? FALLBACK);
}
