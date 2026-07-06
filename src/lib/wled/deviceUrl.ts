/**
 * URL of a device's own (native) WLED web UI, for jumping to device-level settings.
 * Returns null for the in-process mock device or an empty host.
 */
export function wledUiUrl(host: string | undefined | null): string | null {
	if (!host || host === 'mock') return null;
	return `http://${host}/`;
}
