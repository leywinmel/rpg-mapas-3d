import { createDragThrottle } from './drag-throttle';

const TOKEN = '00000000-0000-4000-8000-000000000001';

describe('createDragThrottle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shouldSendTheFirstCellRightAway', () => {
    const send = vi.fn();
    const throttle = createDragThrottle(send, 60, () => Date.now());
    throttle.push({ tokenId: TOKEN, x: 1, z: 1 });
    expect(send).toHaveBeenCalledWith({ tokenId: TOKEN, x: 1, z: 1 });
  });

  it('shouldIgnoreTheSameCellTwice', () => {
    const send = vi.fn();
    const throttle = createDragThrottle(send, 60, () => Date.now());
    throttle.push({ tokenId: TOKEN, x: 1, z: 1 });
    throttle.push({ tokenId: TOKEN, x: 1, z: 1 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('shouldSendOnlyTheLatestCellAfterTheInterval', () => {
    const send = vi.fn();
    const throttle = createDragThrottle(send, 60, () => Date.now());
    throttle.push({ tokenId: TOKEN, x: 1, z: 1 });
    throttle.push({ tokenId: TOKEN, x: 2, z: 1 });
    throttle.push({ tokenId: TOKEN, x: 3, z: 1 });
    expect(send).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ tokenId: TOKEN, x: 3, z: 1 });
  });

  it('shouldDropThePendingCellWhenCancelled', () => {
    const send = vi.fn();
    const throttle = createDragThrottle(send, 60, () => Date.now());
    throttle.push({ tokenId: TOKEN, x: 1, z: 1 });
    throttle.push({ tokenId: TOKEN, x: 2, z: 1 });
    throttle.cancel();
    vi.advanceTimersByTime(100);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
