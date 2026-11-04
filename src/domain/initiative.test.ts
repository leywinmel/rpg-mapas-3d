import {
  advanceTurn,
  isNewRound,
  moveWithinTie,
  nextInitiativePosition,
  nextTurn,
  previousTurn,
  sortInitiative,
  tieNeighbors,
  type InitiativeEntry,
} from './initiative';

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

  describe('nextTurn', () => {
    it('shouldStartTheCombatAtRoundOne', () => {
      expect(nextTurn([entry('goblin', 5), entry('ana', 18)], 0)).toEqual({
        currentId: 'ana',
        round: 1,
      });
    });

    it('shouldKeepTheRoundInsideIt', () => {
      const entries = [entry('ana', 18, 0, true), entry('goblin', 5)];
      expect(nextTurn(entries, 3)).toEqual({ currentId: 'goblin', round: 3 });
    });

    it('shouldOpenANewRoundAfterTheLast', () => {
      const entries = [entry('ana', 18), entry('goblin', 5, 0, true)];
      expect(nextTurn(entries, 3)).toEqual({ currentId: 'ana', round: 4 });
    });

    it('shouldStopOnAnEmptyList', () => {
      expect(nextTurn([], 4)).toEqual({ currentId: null, round: 0 });
    });
  });

  describe('previousTurn', () => {
    it('shouldGoBackInsideTheRound', () => {
      const entries = [entry('ana', 18), entry('goblin', 5, 0, true)];
      expect(previousTurn(entries, 2)).toEqual({ currentId: 'ana', round: 2 });
    });

    it('shouldGoBackToTheLastOfThePreviousRound', () => {
      const entries = [entry('ana', 18, 0, true), entry('goblin', 5)];
      expect(previousTurn(entries, 2)).toEqual({ currentId: 'goblin', round: 1 });
    });

    it('shouldNotGoBelowTheFirstRound', () => {
      const entries = [entry('ana', 18, 0, true), entry('goblin', 5)];
      expect(previousTurn(entries, 1)).toEqual({ currentId: 'ana', round: 1 });
    });
  });

  it('shouldPlaceNewEntriesAfterEveryone', () => {
    expect(nextInitiativePosition([])).toBe(0);
    expect(nextInitiativePosition([entry('a', 1, 4), entry('b', 1, 2)])).toBe(5);
  });

  describe('moveWithinTie', () => {
    it('shouldSwapTiedNeighbors', () => {
      const entries = [entry('ana', 12, 0), entry('bia', 12, 1), entry('goblin', 5, 2)];
      expect(moveWithinTie(entries, 'bia', 'up')).toEqual([
        { id: 'bia', position: 0 },
        { id: 'ana', position: 1 },
      ]);
    });

    it('shouldSwapEvenWhenPositionsAreEqual', () => {
      const entries = [entry('ana', 12), entry('bia', 12)];
      const moved = moveWithinTie(entries, 'ana', 'down');
      const after = entries.map((item) => ({
        ...item,
        position: moved?.find((change) => change.id === item.id)?.position ?? item.position,
      }));
      expect(sortInitiative(after).map((item) => item.id)).toEqual(['bia', 'ana']);
    });

    it('shouldRefuseWhenTheNeighborHasAnotherValue', () => {
      const entries = [entry('ana', 18), entry('goblin', 5)];
      expect(moveWithinTie(entries, 'goblin', 'up')).toBeNull();
      expect(moveWithinTie(entries, 'ana', 'up')).toBeNull();
      expect(tieNeighbors(entries, 'ana')).toEqual({ up: false, down: false });
    });
  });
});
