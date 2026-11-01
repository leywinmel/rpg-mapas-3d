import { MAX_DICE_PER_ROLL, MAX_MODIFIER, parseDice, type DiceExpression } from '@/domain';
import {
  addDie,
  countBySides,
  countDice,
  describeGroup,
  EMPTY_EXPRESSION,
  removeDie,
  withModifier,
} from './pool';

function parsed(notation: string): DiceExpression {
  const result = parseDice(notation);
  if (!result.ok) throw new Error(result.error);
  return result.expression;
}

function added(expression: DiceExpression, ...sides: Array<4 | 6 | 8 | 10 | 12 | 20 | 100>) {
  return sides.reduce<DiceExpression>((current, die) => {
    const next = addDie(current, die);
    if (!next) throw new Error('parada cheia');
    return next;
  }, expression);
}

describe('addDie', () => {
  it('shouldStartAGroupAndThenGrowIt', () => {
    expect(added(EMPTY_EXPRESSION, 6).notation).toBe('1d6');
    expect(added(EMPTY_EXPRESSION, 6, 6, 6).notation).toBe('3d6');
  });

  it('shouldKeepDifferentDiceInTheOrderTheyWereAdded', () => {
    expect(added(EMPTY_EXPRESSION, 20, 6, 20, 4).notation).toBe('2d20 + 1d6 + 1d4');
  });

  it('shouldKeepTheBonusAndKeepRules', () => {
    expect(added(parsed('2d20kh1+3'), 20).notation).toBe('3d20kh1 + 3');
  });

  it('shouldNotGrowANegativeGroup', () => {
    expect(added(parsed('1d8-1d4'), 4).notation).toBe('1d8 - 1d4 + 1d4');
  });

  it('shouldRefuseToGoOverTheLimitOfDicePerRoll', () => {
    const full = parsed(`${MAX_DICE_PER_ROLL}d6`);
    expect(addDie(full, 6)).toBeNull();
    expect(addDie(full, 20)).toBeNull();
  });

  it('shouldProduceNotationTheParserAccepts', () => {
    const expression = withModifier(added(EMPTY_EXPRESSION, 12, 12, 100, 8), -4);
    expect(parseDice(expression.notation)).toEqual({ ok: true, expression });
  });
});

describe('removeDie', () => {
  it('shouldTakeOneDieFromTheGroup', () => {
    expect(removeDie(parsed('3d6+2'), 0).notation).toBe('2d6 + 2');
  });

  it('shouldDropTheGroupWhenTheLastDieLeaves', () => {
    expect(removeDie(parsed('1d6+1d4'), 0).notation).toBe('1d4');
    expect(removeDie(parsed('1d6'), 0)).toEqual(EMPTY_EXPRESSION);
  });

  it('shouldNotKeepMoreDiceThanRemain', () => {
    const smaller = removeDie(parsed('3d20kh2'), 0);
    expect(smaller.notation).toBe('2d20kh2');
    const single = removeDie(smaller, 0);
    expect(single.notation).toBe('1d20kh1');
    expect(parseDice(single.notation).ok).toBe(true);
  });

  it('shouldLeaveOtherGroupsAlone', () => {
    expect(removeDie(parsed('2d6+2d8'), 1).notation).toBe('2d6 + 1d8');
    expect(removeDie(parsed('2d6'), 5).notation).toBe('2d6');
  });
});

describe('withModifier', () => {
  it('shouldSetTheBonusKeepingTheDice', () => {
    expect(withModifier(parsed('2d6'), 5).notation).toBe('2d6 + 5');
    expect(withModifier(parsed('2d6+5'), -2).notation).toBe('2d6 - 2');
    expect(withModifier(parsed('2d6+5'), 0).notation).toBe('2d6');
  });

  it('shouldKeepItWholeAndInsideTheAcceptedRange', () => {
    expect(withModifier(parsed('1d6'), 2.9).modifier).toBe(2);
    expect(withModifier(parsed('1d6'), -2.9).modifier).toBe(-2);
    expect(withModifier(parsed('1d6'), 999999).modifier).toBe(MAX_MODIFIER);
    expect(withModifier(parsed('1d6'), -999999).modifier).toBe(-MAX_MODIFIER);
    expect(withModifier(parsed('1d6'), Number.NaN).modifier).toBe(0);
  });
});

describe('counting', () => {
  it('shouldCountDiceAndDiceByType', () => {
    const expression = parsed('2d6+1d20+3d6-1d4');
    expect(countDice(expression)).toBe(7);
    expect(countBySides(expression)).toEqual({ 6: 5, 20: 1, 4: 1 });
    expect(countDice(EMPTY_EXPRESSION)).toBe(0);
  });
});

describe('describeGroup', () => {
  it('shouldWriteGroupsForButtonsAndScreenReaders', () => {
    const [plain, keep, negative] = parsed('2d6+2d20kh1-1d4').groups;
    expect(describeGroup(plain!)).toBe('2d6');
    expect(describeGroup(keep!)).toBe('2d20kh1');
    expect(describeGroup(negative!)).toBe('−1d4');
  });
});
