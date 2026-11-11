import { masterCutaway, playerCutaway, type CutawayBinding } from './cutaway-binding';

function binding(overrides: Partial<CutawayBinding>): CutawayBinding {
  return {
    own: null,
    setOwn: () => undefined,
    tableCutaway: null,
    setTableCutaway: () => Promise.resolve(),
    ...overrides,
  };
}

describe('cutaway-binding', () => {
  it('shouldShowTheMasterHisOwnCutWhateverTheTableSees', () => {
    expect(masterCutaway(binding({ tableCutaway: 4 }))).toBeNull();
    expect(masterCutaway(binding({ own: 12, tableCutaway: 4 }))).toBe(12);
  });

  it('shouldShowThePlayerOnlyWhatTheMasterChoseForTheTable', () => {
    expect(playerCutaway(null)).toBeNull();
    expect(playerCutaway(8)).toBe(8);
  });
});
