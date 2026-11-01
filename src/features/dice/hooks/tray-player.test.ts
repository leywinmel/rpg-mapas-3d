import { MAX_QUEUED_PLAYBACKS, PLAYED_MEMORY } from '../constants';
import type { SimulatedThrow } from '../physics/simulate';
import {
  INITIAL_PLAYER,
  playDurationMs,
  playerReducer,
  type PlayerAction,
  type PlayerState,
  type PlayItem,
} from './tray-player';

function sim(frameCount = 61): SimulatedThrow {
  return {
    sides: [6],
    bodies: ['d6'],
    frames: new Float32Array(frameCount * 7),
    frameCount,
    settled: true,
    values: [3],
    maxTiltDegrees: 0,
  };
}

function item(id: string, frameCount?: number): PlayItem {
  return { id, notation: '1d6', sim: sim(frameCount) };
}

function run(actions: PlayerAction[], from: PlayerState = INITIAL_PLAYER): PlayerState {
  return actions.reduce(playerReducer, from);
}

describe('playDurationMs', () => {
  it('shouldMeasureTheAnimationFromTheNumberOfPhysicsSteps', () => {
    expect(playDurationMs(sim(61))).toBe(1000);
    expect(playDurationMs(sim(121))).toBe(2000);
    expect(playDurationMs(sim(1))).toBe(0);
  });
});

describe('playerReducer', () => {
  it('shouldPlayTheFirstRollRightAway', () => {
    const state = run([{ type: 'enqueue', item: item('a'), now: 500 }]);
    expect(state.current).toMatchObject({ id: 'a', startedAt: 500, phase: 'playing' });
    expect(state.queue).toEqual([]);
  });

  it('shouldQueueWhatArrivesWhileTheTrayIsBusy', () => {
    const state = run([
      { type: 'enqueue', item: item('a'), now: 0 },
      { type: 'enqueue', item: item('b'), now: 10 },
      { type: 'enqueue', item: item('c'), now: 20 },
    ]);
    expect(state.current?.id).toBe('a');
    expect(state.queue.map((queued) => queued.id)).toEqual(['b', 'c']);
  });

  it('shouldMarkTheCurrentRollAsDoneButKeepItOnTheTray', () => {
    const state = run([
      { type: 'enqueue', item: item('a'), now: 0 },
      { type: 'finished', id: 'a' },
    ]);
    expect(state.current).toMatchObject({ id: 'a', phase: 'done' });
  });

  it('shouldIgnoreTheEndOfARollThatIsNotTheCurrentOne', () => {
    const before = run([{ type: 'enqueue', item: item('a'), now: 0 }]);
    expect(playerReducer(before, { type: 'finished', id: 'zzz' })).toBe(before);
  });

  it('shouldStartTheNextOfTheQueueOnlyAfterTheCurrentIsDone', () => {
    const playing = run([
      { type: 'enqueue', item: item('a'), now: 0 },
      { type: 'enqueue', item: item('b'), now: 0 },
    ]);
    expect(playerReducer(playing, { type: 'advance', now: 5 })).toBe(playing);

    const next = run(
      [
        { type: 'finished', id: 'a' },
        { type: 'advance', now: 5000 },
      ],
      playing,
    );
    expect(next.current).toMatchObject({ id: 'b', startedAt: 5000, phase: 'playing' });
    expect(next.queue).toEqual([]);
  });

  it('shouldDoNothingOnAdvanceWhenTheQueueIsEmpty', () => {
    const done = run([
      { type: 'enqueue', item: item('a'), now: 0 },
      { type: 'finished', id: 'a' },
    ]);
    expect(playerReducer(done, { type: 'advance', now: 1 })).toBe(done);
  });

  it('shouldStartANewRollAtOnceWhenTheLastOneIsDoneAndNobodyWaits', () => {
    const state = run([
      { type: 'enqueue', item: item('a'), now: 0 },
      { type: 'finished', id: 'a' },
      { type: 'enqueue', item: item('b'), now: 7000 },
    ]);
    expect(state.current).toMatchObject({ id: 'b', startedAt: 7000, phase: 'playing' });
  });

  it('shouldQueueBehindWaitersEvenWhenTheCurrentRollIsDone', () => {
    const state = run([
      { type: 'enqueue', item: item('a'), now: 0 },
      { type: 'enqueue', item: item('b'), now: 0 },
      { type: 'finished', id: 'a' },
      { type: 'enqueue', item: item('c'), now: 100 },
    ]);
    expect(state.current?.id).toBe('a');
    expect(state.queue.map((queued) => queued.id)).toEqual(['b', 'c']);
  });

  it('shouldIgnoreARollItAlreadyKnows', () => {
    const state = run([
      { type: 'enqueue', item: item('a'), now: 0 },
      { type: 'enqueue', item: item('a'), now: 5 },
    ]);
    expect(state.current?.startedAt).toBe(0);
    expect(state.queue).toEqual([]);

    // Mesmo depois de terminar e a fila andar, a mensagem repetida não anima de novo.
    const later = run(
      [
        { type: 'finished', id: 'a' },
        { type: 'enqueue', item: item('a'), now: 9000 },
      ],
      state,
    );
    expect(later.current).toMatchObject({ id: 'a', phase: 'done', startedAt: 0 });
  });

  it('shouldDropTheOldestWaitingAnimationWhenTheQueueIsFull', () => {
    const waiting = Array.from({ length: MAX_QUEUED_PLAYBACKS + 2 }, (_, index) =>
      item(`w${index}`),
    );
    const state = run([
      { type: 'enqueue', item: item('now'), now: 0 },
      ...waiting.map((queued): PlayerAction => ({ type: 'enqueue', item: queued, now: 1 })),
    ]);
    expect(state.current?.id).toBe('now');
    expect(state.queue).toHaveLength(MAX_QUEUED_PLAYBACKS);
    expect(state.queue.at(-1)?.id).toBe(`w${MAX_QUEUED_PLAYBACKS + 1}`);
    expect(state.queue[0]?.id).toBe('w2');
  });

  it('shouldRememberOnlyTheLatestRolls', () => {
    let state = INITIAL_PLAYER;
    for (let index = 0; index < PLAYED_MEMORY + 10; index++) {
      state = run(
        [
          { type: 'enqueue', item: item(`r${index}`), now: index },
          { type: 'finished', id: `r${index}` },
        ],
        state,
      );
    }
    expect(state.seen).toHaveLength(PLAYED_MEMORY);
    expect(state.seen.at(-1)).toBe(`r${PLAYED_MEMORY + 9}`);
  });
});
