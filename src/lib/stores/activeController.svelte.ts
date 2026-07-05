/**
 * Owns the single DeviceController for the active device, shared across routes (Control &
 * Designer) so they use one WS connection and one reactive state. The layout drives sync()
 * whenever the active device changes.
 */
import { DeviceController } from './device.svelte';
import { devices } from './devices.svelte';

class ActiveControllerStore {
	controller = $state<DeviceController | null>(null);
	private currentId: string | null = null;

	/** Rebuild the controller when the active device changes (no-op otherwise). */
	sync() {
		const id = devices.active?.id ?? null;
		if (id === this.currentId) return;
		this.currentId = id;
		this.controller?.destroy();
		if (id) {
			const c = new DeviceController(id);
			this.controller = c;
			c.init();
		} else {
			this.controller = null;
		}
	}

	destroy() {
		this.controller?.destroy();
		this.controller = null;
		this.currentId = null;
	}
}

export const activeController = new ActiveControllerStore();
