/** Lowest free WLED preset slot (1–250) given the currently-used slots, or null if full. */
export function nextFreePreset(used: Iterable<number>): number | null {
	const taken = new Set(used);
	for (let slot = 1; slot <= 250; slot++) {
		if (!taken.has(slot)) return slot;
	}
	return null;
}
