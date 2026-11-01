import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  commitFrom,
  createHistory,
  pushHistory,
  redo,
  replacePresent,
  undo,
} from './history';

describe('history', () => {
  it('shouldUndoAndRedoInOrder', () => {
    const history = pushHistory(pushHistory(createHistory('a'), 'b'), 'c');
    const back = undo(history);
    expect(back.present).toBe('b');
    expect(undo(back).present).toBe('a');
    expect(redo(back).present).toBe('c');
  });

  it('shouldClearRedoWhenSomethingNewHappens', () => {
    const history = undo(pushHistory(createHistory('a'), 'b'));
    expect(canRedo(history)).toBe(true);
    const next = pushHistory(history, 'x');
    expect(canRedo(next)).toBe(false);
    expect(next.past).toEqual(['a']);
  });

  it('shouldIgnoreAStepThatChangesNothing', () => {
    const history = createHistory('a');
    expect(pushHistory(history, 'a')).toBe(history);
    expect(commitFrom(history, 'a')).toBe(history);
  });

  it('shouldKeepOnlyTheLastStepsUpToTheLimit', () => {
    let history = createHistory(0, 3);
    for (let step = 1; step <= 10; step += 1) history = pushHistory(history, step);
    expect(history.past).toEqual([7, 8, 9]);
    expect(history.present).toBe(10);
  });

  it('shouldTurnAWholeStrokeIntoASingleUndoStep', () => {
    const start = createHistory('antes');
    const painting = replacePresent(replacePresent(start, 'meio'), 'fim');
    expect(canUndo(painting)).toBe(false);
    const committed = commitFrom(painting, 'antes');
    expect(committed.present).toBe('fim');
    expect(undo(committed).present).toBe('antes');
  });

  it('shouldDoNothingWhenThereIsNothingToUndoOrRedo', () => {
    const history = createHistory('a');
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
  });
});
