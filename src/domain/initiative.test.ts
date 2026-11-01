import { advanceTurn, isNewRound, sortInitiative, type InitiativeEntry } from './initiative';

function entry(id: string, value: number, position = 0, isCurrent = false): InitiativeEntry {
  return { id, label: id, value, position, isCurrent };
}

describe('initiative', () => {
  it('shouldOrderByHighestValueThenManualTieBreak', () => {
    const ordered = sortInitiative([entry('goblin', 12, 1), entry('ana', 18), entry('bia', 12, 0)]);
    expect(ordered.map((e) => e.id)).toEqual(['ana', 'bia', 'goblin']);
  });

  it('shouldStartWithTheFirstWhenNobodyIsCurrent', () => {
    const next = advanceTurn([entry('goblin', 5), entry('ana', 18)]);
    expect(next.find((e) => e.isCurrent)?.id).toBe('ana');
  });

  it('shouldWrapToTheFirstAndFlagANewRound', () => {
    const before = [entry('ana', 18), entry('goblin', 5, 0, true)];
    const after = advanceTurn(before);
    expect(after.find((e) => e.isCurrent)?.id).toBe('ana');
    expect(isNewRound(before, after)).toBe(true);
  });

  it('shouldHandleAnEmptyList', () => {
    expect(advanceTurn([])).toEqual([]);
  });
});
