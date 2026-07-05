import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { throttle } from './throttle';

describe('throttle', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('fires immediately on the first call', () => {
		const fn = vi.fn();
		const t = throttle(fn, 100);
		t(1);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenLastCalledWith(1);
	});

	it('coalesces rapid calls and delivers the latest args', () => {
		const fn = vi.fn();
		const t = throttle(fn, 100);
		t(1); // immediate
		t(2);
		t(3); // within window — coalesced
		expect(fn).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenLastCalledWith(3);
	});

	it('flush() delivers the pending call synchronously', () => {
		const fn = vi.fn();
		const t = throttle(fn, 100);
		t(1);
		t(2);
		t.flush();
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenLastCalledWith(2);
	});

	it('cancel() drops the pending call', () => {
		const fn = vi.fn();
		const t = throttle(fn, 100);
		t(1);
		t(2);
		t.cancel();
		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
