/**
 * Human-readable descriptions of what each WLED effect does, shown in the effect
 * picker's info card.
 *
 * Descriptions are vendored from the community-maintained, MIT-licensed
 * `effect_descriptions.json` in scottrbailey/WLED-Utils (© Artacus):
 * https://github.com/scottrbailey/WLED-Utils
 *
 * We match by NAME, not by the file's `id`: the app reads the live effect list from
 * the device (id = array index), and that ordering can differ across WLED
 * versions/builds (and includes reserved "RSVD" slots). Normalized-name lookup is
 * robust to that; a miss just means no description (the card falls back to metadata).
 */
import descriptions from './effect-descriptions.json';

interface EffectDescription {
	id: string;
	name: string;
	description: string;
}

/** Lowercase, trim, and collapse internal whitespace so lookups are order- and case-insensitive. */
function normalize(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

const byName = new Map<string, string>();
for (const e of descriptions as EffectDescription[]) {
	const desc = e.description?.trim();
	if (desc) byName.set(normalize(e.name), desc);
}

/** Return the description for an effect by name, or `undefined` if none is known. */
export function descriptionFor(name: string): string | undefined {
	return byName.get(normalize(name));
}
