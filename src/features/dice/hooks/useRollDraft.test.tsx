// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { MAX_DICE_PER_ROLL } from '@/domain';
import { useRollDraft } from './useRollDraft';

function draft() {
  return renderHook(() => useRollDraft());
}

describe('useRollDraft', () => {
  it('shouldStartEmptyWithoutAnErrorOrARollableExpression', () => {
    const { result } = draft();
    expect(result.current).toMatchObject({ notation: '', expression: null, error: null });
    expect(result.current.pool.groups).toEqual([]);
  });

  it('shouldWriteTheNotationWhenDiceAreAdded', () => {
    const { result } = draft();
    act(() => result.current.add(6));
    act(() => result.current.add(6));
    act(() => result.current.add(20));
    expect(result.current.notation).toBe('2d6 + 1d20');
    expect(result.current.counts).toEqual({ 6: 2, 20: 1 });
    expect(result.current.expression?.groups).toHaveLength(2);
  });

  it('shouldNotLoseAClickWhenTwoHappenBeforeTheScreenUpdates', () => {
    const { result } = draft();
    act(() => {
      result.current.add(20);
      result.current.add(20);
      result.current.add(20);
    });
    expect(result.current.notation).toBe('3d20');
  });

  it('shouldRemoveDiceAndClear', () => {
    const { result } = draft();
    act(() => result.current.setNotation('3d6+1d4'));
    act(() => result.current.remove(0));
    expect(result.current.notation).toBe('2d6 + 1d4');
    act(() => result.current.clear());
    expect(result.current.notation).toBe('');
    expect(result.current.expression).toBeNull();
  });

  it('shouldChangeTheBonusKeepingTheDice', () => {
    const { result } = draft();
    act(() => result.current.setNotation('2d20kh1'));
    act(() => result.current.setModifier(5));
    expect(result.current.notation).toBe('2d20kh1 + 5');
    act(() => result.current.setModifier(-3));
    expect(result.current.notation).toBe('2d20kh1 - 3');
    expect(result.current.pool.modifier).toBe(-3);
  });

  it('shouldFollowWhatIsTypedAndExplainMistakes', () => {
    const { result } = draft();
    act(() => result.current.setNotation('1d7'));
    expect(result.current.expression).toBeNull();
    expect(result.current.error).toMatch(/Não existe dado de 7 lados/);

    act(() => result.current.setNotation('4d6'));
    expect(result.current.error).toBeNull();
    expect(result.current.counts).toEqual({ 6: 4 });
  });

  it('shouldStartOverFromAnEmptyPoolWhenTheTextIsInvalid', () => {
    const { result } = draft();
    act(() => result.current.setNotation('2d6++'));
    act(() => result.current.add(8));
    expect(result.current.notation).toBe('1d8');
    expect(result.current.error).toBeNull();
  });

  it('shouldNotRollWithoutDiceEvenWithABonus', () => {
    const { result } = draft();
    act(() => result.current.setModifier(4));
    expect(result.current.notation).toBe('+ 4');
    expect(result.current.expression).toBeNull();
    expect(result.current.error).toMatch(/pelo menos um dado/);
  });

  it('shouldBlockMoreDiceThanTheLimit', () => {
    const { result } = draft();
    act(() => result.current.setNotation(`${MAX_DICE_PER_ROLL}d6`));
    expect(result.current.full).toBe(true);
    act(() => result.current.add(6));
    expect(result.current.notation).toBe(`${MAX_DICE_PER_ROLL}d6`);
  });
});
