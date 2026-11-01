import { setLogSink, type LogEntry } from '@/lib/logger';
import { toDiceRoll, type DiceRollRow } from './roll-row';

function row(overrides: Partial<DiceRollRow> = {}): DiceRollRow {
  return {
    id: 'roll-1',
    room_id: 'room-1',
    roller_id: 'user-1',
    notation: '2d20kh1 + 3',
    results: [
      { sides: 20, value: 4 },
      { sides: 20, value: 17 },
    ],
    modifier: 3,
    total: 20,
    hidden: false,
    created_at: '2026-11-01T12:00:00Z',
    ...overrides,
  };
}

const keptOf = (overrides: Partial<DiceRollRow>) =>
  toDiceRoll(row(overrides)).dice.map((die) => die.kept);

describe('toDiceRoll', () => {
  it('shouldKeepTheHighestForAdvantageAndTheLowestForDisadvantage', () => {
    expect(keptOf({})).toEqual([false, true]);
    expect(keptOf({ notation: '2d20kl1 + 3' })).toEqual([true, false]);
  });

  it('shouldKeepEveryDieWhenThereIsNoKeepRule', () => {
    expect(
      keptOf({
        notation: '2d20 + 3',
        results: [
          { sides: 20, value: 4 },
          { sides: 20, value: 17 },
        ],
      }),
    ).toEqual([true, true]);
  });

  it('shouldDecideKeepPerGroupWhenTheRollMixesDice', () => {
    const roll = toDiceRoll(
      row({
        notation: '3d6kh2 + 1d8',
        results: [
          { sides: 6, value: 2 },
          { sides: 6, value: 6 },
          { sides: 6, value: 5 },
          { sides: 8, value: 1 },
        ],
        modifier: 0,
        total: 12,
      }),
    );
    expect(roll.dice.map((die) => die.kept)).toEqual([false, true, true, true]);
  });

  it('shouldShowEveryDieWhenTheNotationCannotBeRead', () => {
    expect(keptOf({ notation: 'isso não é uma rolagem' })).toEqual([true, true]);
  });

  it('shouldShowEveryDieWhenTheNotationDoesNotMatchTheStoredDice', () => {
    expect(keptOf({ notation: '1d6' })).toEqual([true, true]);
    expect(keptOf({ notation: '2d6kh1' })).toEqual([true, true]);
  });

  it('shouldCopyTheOtherColumns', () => {
    const roll = toDiceRoll(row({ hidden: true, roller_id: null }));
    expect(roll).toMatchObject({
      id: 'roll-1',
      roomId: 'room-1',
      rollerId: null,
      notation: '2d20kh1 + 3',
      modifier: 3,
      total: 20,
      hidden: true,
      createdAt: '2026-11-01T12:00:00Z',
    });
  });

  describe('com linha estragada', () => {
    const logs: LogEntry[] = [];
    afterEach(() => {
      logs.length = 0;
    });

    it('shouldReturnARollWithoutDiceAndLeaveATraceInTheLog', () => {
      setLogSink((entry) => logs.push(entry));
      for (const results of ['oops', [], [{ sides: 7, value: 1 }], [{ sides: 6, value: 9 }]]) {
        const roll = toDiceRoll(row({ notation: '1d6', results }));
        expect(roll.dice).toEqual([]);
        expect(roll.total).toBe(20);
      }
      expect(logs.filter((entry) => entry.level === 'warn')).toHaveLength(4);
      expect(logs[0]?.context).toMatchObject({ feature: 'dice', rollId: 'roll-1' });
    });
  });
});
