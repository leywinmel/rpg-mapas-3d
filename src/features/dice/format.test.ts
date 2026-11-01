import { describeRoll, formatRollMoment, formatRollTime, signedModifier } from './format';
import type { DiceRoll } from './types';

function roll(overrides: Partial<DiceRoll> = {}): DiceRoll {
  return {
    id: 'r1',
    roomId: 'room',
    rollerId: 'user',
    notation: '2d20kh1 + 3',
    dice: [
      { sides: 20, value: 17, kept: true },
      { sides: 20, value: 4, kept: false },
    ],
    modifier: 3,
    total: 20,
    hidden: false,
    createdAt: '2026-11-01T17:32:09Z',
    ...overrides,
  };
}

describe('formatRollTime', () => {
  it('shouldShowHoursAndMinutesInThePortugueseStyle', () => {
    expect(formatRollTime('2026-11-01T17:32:09Z', 'UTC')).toBe('17:32');
    expect(formatRollTime('2026-11-01T17:32:09Z', 'America/Sao_Paulo')).toBe('14:32');
  });

  it('shouldReturnNothingForABrokenDateInsteadOfThrowing', () => {
    expect(formatRollTime('ontem')).toBe('');
    expect(formatRollMoment('')).toBe('');
  });

  it('shouldWriteTheFullMomentForTheTooltip', () => {
    // Alguns navegadores separam data e hora com vírgula, outros não.
    expect(formatRollMoment('2026-11-01T17:32:09Z', 'UTC')).toMatch(/^01\/11\/2026,? 17:32:09$/);
  });
});

describe('signedModifier', () => {
  it('shouldWriteTheSignAndHideZero', () => {
    expect(signedModifier(3)).toBe('+3');
    expect(signedModifier(-2)).toBe('−2');
    expect(signedModifier(0)).toBe('');
  });
});

describe('describeRoll', () => {
  it('shouldSayWhoRolledWhatAndWhichDiceWereDiscarded', () => {
    expect(describeRoll(roll(), 'Ana')).toBe(
      'Ana rolou 2d20kh1 + 3: 17, 4 (descartado), bônus +3. Total 20.',
    );
  });

  it('shouldLeaveOutTheBonusWhenThereIsNone', () => {
    const plain = roll({
      notation: '1d6',
      dice: [{ sides: 6, value: 5, kept: true }],
      modifier: 0,
      total: 5,
    });
    expect(describeRoll(plain, 'Bia')).toBe('Bia rolou 1d6: 5. Total 5.');
  });

  it('shouldWarnTheMasterThatTheRollIsHidden', () => {
    expect(describeRoll(roll({ hidden: true }), 'Mestre')).toContain('só você vê');
  });
});
