/**
 * Trailing throttle for high-frequency writes (slider drags) to a small MCU.
 *
 * Guarantees:
 *  - the first call fires immediately,
 *  - subsequent calls within `waitMs` are coalesced,
 *  - the *latest* arguments are always delivered once the window elapses.
 */
export function throttle<A extends unknown[]>(
	fn: (...args: A) => void,
	waitMs: number
): ((...args: A) => void) & { flush: () => void; cancel: () => void } {
	let last = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: A | null = null;

	const invoke = (args: A) => {
		last = Date.now();
		fn(...args);
	};

	const throttled = (...args: A) => {
		const now = Date.now();
		const remaining = waitMs - (now - last);
		pending = args;
		if (remaining <= 0) {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			invoke(args);
			pending = null;
		} else if (!timer) {
			timer = setTimeout(() => {
				timer = null;
				if (pending) {
					invoke(pending);
					pending = null;
				}
			}, remaining);
		}
	};

	throttled.flush = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		if (pending) {
			invoke(pending);
			pending = null;
		}
	};

	throttled.cancel = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		pending = null;
	};

	return throttled;
}
