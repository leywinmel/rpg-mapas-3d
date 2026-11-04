import { createLatestThrottle } from './latest-throttle';

describe('createLatestThrottle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shouldSendTheFirstValueRightAway', () => {
    const send = vi.fn();
    createLatestThrottle(send, 100, () => Date.now()).push('a');
    expect(send).toHaveBeenCalledWith('a');
  });

  it('shouldKeepOnlyTheLatestValueInsideTheInterval', () => {
    const send = vi.fn();
    const throttle = createLatestThrottle(send, 100, () => Date.now());
    throttle.push('a');
    throttle.push('b');
    throttle.push('c');
    expect(send).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(send).toHaveBeenLastCalledWith('c');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('shouldDropThePendingValueOnCancel', () => {
    const send = vi.fn();
    const throttle = createLatestThrottle(send, 100, () => Date.now());
    throttle.push('a');
    throttle.push('b');
    throttle.cancel();
    vi.advanceTimersByTime(200);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
