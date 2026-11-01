import { createCoalescer } from './signal-coalescer';

const DELAY_MS = 300;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createCoalescer', () => {
  it('shouldRunOnceForSignalsInsideTheInterval', () => {
    const run = vi.fn();
    const coalescer = createCoalescer(run, DELAY_MS);
    coalescer.trigger();
    vi.advanceTimersByTime(100);
    coalescer.trigger();
    vi.advanceTimersByTime(100);
    coalescer.trigger();
    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DELAY_MS);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('shouldNeverDelayTheRunBeyondTheIntervalOfTheFirstSignal', () => {
    const run = vi.fn();
    const coalescer = createCoalescer(run, DELAY_MS);
    coalescer.trigger();
    vi.advanceTimersByTime(DELAY_MS - 1);
    coalescer.trigger();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('shouldRunAgainForASignalAfterTheInterval', () => {
    const run = vi.fn();
    const coalescer = createCoalescer(run, DELAY_MS);
    coalescer.trigger();
    vi.advanceTimersByTime(DELAY_MS);
    coalescer.trigger();
    vi.advanceTimersByTime(DELAY_MS);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('shouldDropTheWaitingRunWhenCancelled', () => {
    const run = vi.fn();
    const coalescer = createCoalescer(run, DELAY_MS);
    coalescer.trigger();
    coalescer.cancel();
    coalescer.cancel();
    vi.advanceTimersByTime(DELAY_MS * 2);
    expect(run).not.toHaveBeenCalled();
  });
});
