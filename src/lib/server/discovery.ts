/**
 * mDNS discovery of WLED devices on the LAN. WLED advertises the `_wled._tcp` service.
 * Used to populate the "add device" flow; manual IP entry is always available too.
 */
import { Bonjour } from 'bonjour-service';

export interface DiscoveredDevice {
	name: string;
	host: string;
	port: number;
}

/** Browse for `_wled._tcp` services for `timeoutMs`, returning unique results. */
export function discoverWled(timeoutMs = 3000): Promise<DiscoveredDevice[]> {
	return new Promise((resolve) => {
		const found = new Map<string, DiscoveredDevice>();
		let bonjour: Bonjour | null = null;
		try {
			bonjour = new Bonjour();
		} catch {
			resolve([]);
			return;
		}

		const browser = bonjour.find({ type: 'wled' }, (service) => {
			// Prefer a routable IPv4 address, else fall back to the mDNS hostname.
			const ipv4 = service.addresses?.find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a));
			const host = ipv4 ?? service.host ?? '';
			if (!host) return;
			found.set(host, { name: service.name ?? host, host, port: service.port ?? 80 });
		});

		setTimeout(() => {
			try {
				browser.stop();
				bonjour?.destroy();
			} catch {
				/* ignore */
			}
			resolve([...found.values()]);
		}, timeoutMs);
	});
}
