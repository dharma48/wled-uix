import type { RGB, WledColor } from './types';

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const hex2 = (n: number) => clamp255(n).toString(16).padStart(2, '0');

export function rgbToHex(c: WledColor | undefined): string {
	if (!c) return '#000000';
	return `#${hex2(c[0])}${hex2(c[1])}${hex2(c[2])}`;
}

export function hexToRgb(hex: string): RGB {
	const m = hex.replace('#', '');
	const v = m.length === 3
		? m.split('').map((ch) => parseInt(ch + ch, 16))
		: [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
	return [clamp255(v[0] || 0), clamp255(v[1] || 0), clamp255(v[2] || 0)];
}

export function cssColor(c: WledColor | undefined): string {
	if (!c) return 'transparent';
	return `rgb(${clamp255(c[0])}, ${clamp255(c[1])}, ${clamp255(c[2])})`;
}

/** Perceived luminance 0-255, for choosing readable foreground on a swatch. */
export function luminance(c: WledColor | undefined): number {
	if (!c) return 0;
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
