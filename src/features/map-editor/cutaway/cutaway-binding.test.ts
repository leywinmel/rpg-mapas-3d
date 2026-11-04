import { steppedOwnCutaway, visibleCutaway, type CutawayBinding } from './cutaway-binding';

function binding(overrides: Partial<CutawayBinding>): CutawayBinding {
  return { own: null, setOwn: () => undefined, lock: null, isMaster: false, ...overrides };
}

describe('cutaway-binding', () => {
  it('shouldLetAFreePlayerWalkThroughTheStories', () => {
    expect(steppedOwnCutaway(binding({}), 'down', 3)).toBe(12);
    expect(steppedOwnCutaway(binding({ own: 12 }), 'up', 3)).toBeNull();
  });

  it('shouldKeepALockedPlayerAtOrBelowTheLock', () => {
    const locked = binding({ lock: 8 });
    expect(visibleCutaway(locked)).toBe(8);
    expect(steppedOwnCutaway(locked, 'up', 3)).toBeNull();
    expect(steppedOwnCutaway(locked, 'down', 3)).toBe(4);
    expect(steppedOwnCutaway(binding({ lock: 8, own: 4 }), 'up', 3)).toBeNull();
  });

  it('shouldIgnoreTheLockForTheMaster', () => {
    const master = binding({ lock: 4, isMaster: true });
    expect(visibleCutaway(master)).toBeNull();
    expect(steppedOwnCutaway(binding({ lock: 4, isMaster: true, own: 4 }), 'up', 3)).toBe(8);
  });
});
