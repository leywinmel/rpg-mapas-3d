import { diceToThrow, evaluateDice, parseDice, rollDice, type DiceExpression } from './dice';

function parsed(notation: string): DiceExpression {
  const result = parseDice(notation);
  if (!result.ok) throw new Error(result.error);
  return result.expression;
}

describe('dice', () => {
  it('shouldParseOwlbearStyleNotation', () => {
    const expression = parsed(' 2D6 + 1d4 - 1 ');
    expect(expression.groups).toEqual([
      { count: 2, sides: 6, sign: 1 },
      { count: 1, sides: 4, sign: 1 },
    ]);
    expect(expression.modifier).toBe(-1);
    expect(expression.notation).toBe('2d6 + 1d4 - 1');
  });

  it('shouldTreatBareDieAsOne', () => {
    expect(parsed('d20').notation).toBe('1d20');
  });

  it('shouldRejectUnknownDiceAndGarbage', () => {
    expect(parseDice('1d7').ok).toBe(false);
    expect(parseDice('').ok).toBe(false);
    expect(parseDice('2d6++3').ok).toBe(false);
    expect(parseDice('abc').ok).toBe(false);
    expect(parseDice('5').ok).toBe(false);
    expect(parseDice('0d6').ok).toBe(false);
  });

  it('shouldLimitDicePerRoll', () => {
    expect(parseDice('50d6').ok).toBe(true);
    expect(parseDice('30d6+21d4').ok).toBe(false);
  });

  it('shouldKeepHighestForAdvantage', () => {
    const outcome = evaluateDice(parsed('2d20kh1+5'), [7, 15]);
    expect(outcome.total).toBe(20);
    expect(outcome.results.map((r) => r.kept)).toEqual([false, true]);
  });

  it('shouldKeepLowestForDisadvantage', () => {
    expect(evaluateDice(parsed('2d20kl1'), [7, 15]).total).toBe(7);
    expect(parseDice('2d20kh3').ok).toBe(false);
  });

  it('shouldSubtractNegativeGroups', () => {
    expect(evaluateDice(parsed('1d8-1d4'), [6, 2]).total).toBe(4);
  });

  it('shouldListDiceForThePhysicsTray', () => {
    expect(diceToThrow(parsed('2d6+1d20'))).toEqual([6, 6, 20]);
  });

  it('shouldRejectImpossibleValuesFromThePhysics', () => {
    expect(() => evaluateDice(parsed('1d6'), [7])).toThrow(RangeError);
    expect(() => evaluateDice(parsed('2d6'), [3])).toThrow();
  });

  it('shouldRollWithinRangeUsingInjectedRandom', () => {
    const max = rollDice(parsed('3d6+2'), () => 0.9999);
    expect(max.total).toBe(20);
    const min = rollDice(parsed('3d6+2'), () => 0);
    expect(min.total).toBe(5);
  });
});
