import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  const limit = { count: 3, windowMs: 1000 };

  it('shouldAllowUpToTheLimitInsideTheWindow', () => {
    let time = 0;
    const limiter = createRateLimiter(limit, () => time);
    expect([1, 2, 3].map(() => limiter.tryTake('ana'))).toEqual([true, true, true]);
    time = 999;
    expect(limiter.tryTake('ana')).toBe(false);
  });

  it('shouldFreeASlotWhenTheOldestLeavesTheWindow', () => {
    let time = 0;
    const limiter = createRateLimiter(limit, () => time);
    limiter.tryTake('ana');
    time = 400;
    limiter.tryTake('ana');
    limiter.tryTake('ana');
    time = 1000;
    expect(limiter.tryTake('ana')).toBe(true);
    expect(limiter.tryTake('ana')).toBe(false);
  });

  it('shouldCountEachKeyApart', () => {
    const limiter = createRateLimiter(limit, () => 0);
    [1, 2, 3].forEach(() => limiter.tryTake('ana'));
    expect(limiter.tryTake('ana')).toBe(false);
    expect(limiter.tryTake('bia')).toBe(true);
  });

  it('shouldNotCountRefusedAttempts', () => {
    let time = 0;
    const limiter = createRateLimiter({ count: 1, windowMs: 1000 }, () => time);
    limiter.tryTake('ana');
    time = 900;
    limiter.tryTake('ana');
    time = 1000;
    expect(limiter.tryTake('ana')).toBe(true);
  });
});
