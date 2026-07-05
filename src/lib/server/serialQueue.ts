/**
 * Creates a keyed serial queue: tasks sharing a key run one at a time, in call order;
 * tasks with different keys run concurrently. A failing task never blocks the next one.
 *
 * Used to serialize HTTP requests per WLED device — the MCU corrupts its JSON output when
 * hit concurrently.
 */
export function createSerialQueue<K = string>() {
	const queues = new Map<K, Promise<unknown>>();

	return function serialize<T>(key: K, task: () => Promise<T>): Promise<T> {
		const prev = queues.get(key) ?? Promise.resolve();
		// Chain onto the previous task whether it resolved or rejected.
		const run = prev.then(task, task);
		// Advance the queue with an outcome-swallowing promise so one failure or a stored
		// rejection can't poison later tasks (or emit unhandled-rejection warnings).
		queues.set(
			key,
			run.then(
				() => undefined,
				() => undefined
			)
		);
		return run;
	};
}
