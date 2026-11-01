import { HISTORY_LIMIT } from '../constants';
import type { DiceRoll } from '../types';
import { historyReducer, INITIAL_HISTORY, mergeRolls, type HistoryState } from './roll-history';

function roll(id: string, minute: number, overrides: Partial<DiceRoll> = {}): DiceRoll {
  return {
    id,
    roomId: 'room',
    rollerId: 'user',
    notation: '1d20',
    dice: [{ sides: 20, value: minute, kept: true }],
    modifier: 0,
    total: minute,
    hidden: false,
    createdAt: new Date(Date.UTC(2026, 10, 1, 12, minute)).toISOString(),
    ...overrides,
  };
}

const ids = (rolls: readonly DiceRoll[]) => rolls.map((item) => item.id);

describe('mergeRolls', () => {
  it('shouldPutTheNewestFirst', () => {
    expect(ids(mergeRolls([roll('b', 2)], [roll('c', 3), roll('a', 1)]))).toEqual(['c', 'b', 'a']);
  });

  it('shouldNotRepeatARollThatArrivesFromTwoSources', () => {
    const merged = mergeRolls([roll('a', 1)], [roll('a', 1), roll('b', 2)]);
    expect(ids(merged)).toEqual(['b', 'a']);
  });

  it('shouldPreferTheIncomingVersionOfARepeatedRoll', () => {
    const merged = mergeRolls([roll('a', 1, { total: 1 })], [roll('a', 1, { total: 99 })]);
    expect(merged[0]?.total).toBe(99);
  });

  it('shouldBreakTiesInTheSameSecondByIdSoTheOrderIsStable', () => {
    const same = [roll('a', 5), roll('b', 5), roll('c', 5)];
    expect(ids(mergeRolls([], same))).toEqual(['c', 'b', 'a']);
    expect(ids(mergeRolls([], [...same].reverse()))).toEqual(['c', 'b', 'a']);
  });

  it('shouldKeepOnlyTheLastN', () => {
    const many = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) => roll(`r${index}`, index));
    const merged = mergeRolls([], many);
    expect(merged).toHaveLength(HISTORY_LIMIT);
    expect(merged[0]?.id).toBe(`r${HISTORY_LIMIT + 4}`);
  });

  it('shouldHonorACustomLimit', () => {
    expect(mergeRolls([roll('a', 1), roll('b', 2)], [], 1)).toHaveLength(1);
  });
});

describe('historyReducer', () => {
  const ready = (rolls: DiceRoll[]): HistoryState => ({ status: 'ready', rolls });

  it('shouldStartLoadingAndEmpty', () => {
    expect(INITIAL_HISTORY).toEqual({ status: 'loading', rolls: [] });
  });

  it('shouldBecomeReadyWithTheLoadedRolls', () => {
    const next = historyReducer(INITIAL_HISTORY, { type: 'loaded', rolls: [roll('a', 1)] });
    expect(next).toEqual(ready([roll('a', 1)]));
  });

  it('shouldKeepARollThatArrivedWhileTheFirstLoadWasStillRunning', () => {
    const arrived = historyReducer(INITIAL_HISTORY, { type: 'inserted', roll: roll('c', 3) });
    expect(arrived.status).toBe('loading');
    const loaded = historyReducer(arrived, { type: 'loaded', rolls: [roll('b', 2), roll('a', 1)] });
    expect(ids(loaded.rolls)).toEqual(['c', 'b', 'a']);
    expect(loaded.status).toBe('ready');
  });

  it('shouldInsertWithoutChangingTheStatus', () => {
    const next = historyReducer(ready([roll('a', 1)]), { type: 'inserted', roll: roll('b', 2) });
    expect(next.status).toBe('ready');
    expect(ids(next.rolls)).toEqual(['b', 'a']);
  });

  it('shouldMoveToErrorWhenTheFirstLoadFails', () => {
    const failure = new Error('sem rede');
    expect(historyReducer(INITIAL_HISTORY, { type: 'failed', error: failure })).toEqual({
      status: 'error',
      rolls: [],
      error: failure,
    });
  });

  it('shouldKeepTheListOnScreenWhenAReloadFails', () => {
    const state = ready([roll('a', 1)]);
    expect(historyReducer(state, { type: 'failed', error: new Error('x') })).toBe(state);
  });

  it('shouldEmptyTheListWhenCleared', () => {
    const next = historyReducer(ready([roll('a', 1)]), { type: 'cleared' });
    expect(next).toEqual(ready([]));
  });

  it('shouldNotBringBackClearedRollsWhenTheyComeFromTheDatabaseAgain', () => {
    const cleared = historyReducer(ready([roll('a', 1)]), { type: 'cleared' });
    const reloaded = historyReducer(cleared, { type: 'loaded', rolls: [roll('n', 9)] });
    expect(ids(reloaded.rolls)).toEqual(['n']);
  });

  it('shouldGoBackToLoadingOnRetry', () => {
    const failed: HistoryState = { status: 'error', rolls: [], error: new Error('x') };
    expect(historyReducer(failed, { type: 'retry' })).toEqual({ status: 'loading', rolls: [] });
  });
});
