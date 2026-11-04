import {
  adjustHealth,
  anchorUnderCursor,
  fitsInMap,
  healthFraction,
  isValidTokenSize,
  tokenCells,
} from './tokens';

const MAP = { width: 10, depth: 8 };

describe('tokens', () => {
  it('shouldAcceptSizesFromOneToFourCells', () => {
    expect(isValidTokenSize(1)).toBe(true);
    expect(isValidTokenSize(4)).toBe(true);
    expect(isValidTokenSize(5)).toBe(false);
    expect(isValidTokenSize(1.5)).toBe(false);
  });

  it('shouldKeepTheWholeTokenInsideTheMap', () => {
    expect(fitsInMap(MAP, { x: 8, z: 6, size: 2 })).toBe(true);
    expect(fitsInMap(MAP, { x: 9, z: 6, size: 2 })).toBe(false);
    expect(fitsInMap(MAP, { x: -1, z: 0, size: 1 })).toBe(false);
  });

  it('shouldCenterTheTokenUnderTheCursorAndClampAtTheEdge', () => {
    expect(anchorUnderCursor(MAP, { x: 5, z: 5 }, 1)).toEqual({ x: 5, z: 5 });
    expect(anchorUnderCursor(MAP, { x: 5, z: 5 }, 3)).toEqual({ x: 4, z: 4 });
    expect(anchorUnderCursor(MAP, { x: 9, z: 7 }, 2)).toEqual({ x: 8, z: 6 });
    expect(anchorUnderCursor(MAP, { x: 0, z: 0 }, 4)).toEqual({ x: 0, z: 0 });
  });

  it('shouldListEveryCellTheTokenOccupies', () => {
    expect(tokenCells({ x: 2, z: 3, size: 2 })).toEqual([
      { x: 2, z: 3 },
      { x: 3, z: 3 },
      { x: 2, z: 4 },
      { x: 3, z: 4 },
    ]);
  });

  it('shouldClampHealthBetweenZeroAndMax', () => {
    expect(adjustHealth({ current: 5, max: 10 }, -7)).toBe(0);
    expect(adjustHealth({ current: 5, max: 10 }, 20)).toBe(10);
    expect(adjustHealth({ current: 5, max: 10 }, 2)).toBe(7);
  });

  it('shouldComputeTheHealthBarFraction', () => {
    expect(healthFraction({ current: 5, max: 10 })).toBe(0.5);
    expect(healthFraction({ current: 5, max: 0 })).toBe(0);
    expect(healthFraction({ current: 15, max: 10 })).toBe(1);
  });
});
