import { describe, expect, it } from 'vitest';
import { createSerialQueue } from './serialQueue';

/** A promise plus its resolve/reject, for hand-controlling task timing. */
function deferred<T>() {
	let resolve!: (v: T) => void;
	let reject!: (e: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('createSerialQueue', () => {
	it('runs same-key tasks one at a time, in order (no overlap)', async () => {
		const serialize = createSerialQueue();
		let running = 0;
		const order: number[] = [];
		const gates = [deferred<void>(), deferred<void>(), deferred<void>()];

		const make = (i: number) =>
			serialize('dev', async () => {
				running++;
				expect(running).toBe(1); // never two at once
				await gates[i].promise;
				order.push(i);
				running--;
			});

		const all = [make(0), make(1), make(2)];
		// Release out of intended order to prove the queue enforces call order.
		gates[0].resolve();
		await Promise.resolve();
		gates[1].resolve();
		gates[2].resolve();
		await Promise.all(all);
		expect(order).toEqual([0, 1, 2]);
	});

	it('runs different keys concurrently', async () => {
		const serialize = createSerialQueue();
		let concurrent = 0;
		let maxConcurrent = 0;
		const gate = deferred<void>();

		const task = (key: string) =>
			serialize(key, async () => {
				concurrent++;
				maxConcurrent = Math.max(maxConcurrent, concurrent);
				await gate.promise;
				concurrent--;
			});

		const a = task('a');
		const b = task('b');
		await Promise.resolve();
		gate.resolve();
		await Promise.all([a, b]);
		expect(maxConcurrent).toBe(2);
	});

	it('does not let a rejected task block the next', async () => {
		const serialize = createSerialQueue();
		const failed = serialize('dev', async () => {
			throw new Error('boom');
		});
		await expect(failed).rejects.toThrow('boom');
		const ok = await serialize('dev', async () => 'recovered');
		expect(ok).toBe('recovered');
	});

	it('returns the task result to the caller', async () => {
		const serialize = createSerialQueue();
		const result = await serialize('dev', async () => 42);
		expect(result).toBe(42);
	});
});
