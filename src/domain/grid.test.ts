import {
  cellIndex,
  cellsInRect,
  clampCell,
  distanceInCells,
  isEdgeInside,
  isInside,
  isValidMapSize,
  worldToCell,
} from './grid';

const size = { width: 10, depth: 8 };

describe('grid', () => {
  it('shouldAcceptMapsUpTo100By100', () => {
    expect(isValidMapSize({ width: 100, depth: 100 })).toBe(true);
    expect(isValidMapSize({ width: 101, depth: 10 })).toBe(false);
    expect(isValidMapSize({ width: 0, depth: 10 })).toBe(false);
    expect(isValidMapSize({ width: 2.5, depth: 10 })).toBe(false);
  });

  it('shouldNumberCellsRowByRowLikeTheDatabase', () => {
    expect(cellIndex(size, { x: 0, z: 0 })).toBe(0);
    expect(cellIndex(size, { x: 3, z: 2 })).toBe(23);
    expect(() => cellIndex(size, { x: 10, z: 0 })).toThrow(RangeError);
  });

  it('shouldDetectCellsOutsideTheMap', () => {
    expect(isInside(size, { x: 9, z: 7 })).toBe(true);
    expect(isInside(size, { x: -1, z: 0 })).toBe(false);
    expect(isInside(size, { x: 0, z: 8 })).toBe(false);
  });

  it('shouldConvertWorldPointsToCells', () => {
    expect(worldToCell(size, 3.7, 0.2)).toEqual({ x: 3, z: 0 });
    expect(worldToCell(size, 10.1, 0)).toBeNull();
  });

  it('shouldClampDraggedTokensToTheBorder', () => {
    expect(clampCell(size, { x: 15, z: -3 })).toEqual({ x: 9, z: 0 });
  });

  it('shouldCountDiagonalsAsOneCellOnTheRuler', () => {
    expect(distanceInCells({ x: 0, z: 0 }, { x: 3, z: 3 })).toBe(3);
    expect(distanceInCells({ x: 1, z: 1 }, { x: 6, z: 3 })).toBe(5);
    expect(distanceInCells({ x: 2, z: 2 }, { x: 2, z: 2 })).toBe(0);
  });

  it('shouldListRectCellsInAnyCornerOrder', () => {
    const cells = cellsInRect(size, { x: 2, z: 1 }, { x: 1, z: 0 });
    expect(cells).toEqual([
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 1, z: 1 },
      { x: 2, z: 1 },
    ]);
  });

  it('shouldAcceptTheEastAndSouthBordersAsEdges', () => {
    expect(isEdgeInside(size, { x: 9, z: 8, side: 'north' })).toBe(true);
    expect(isEdgeInside(size, { x: 10, z: 7, side: 'west' })).toBe(true);
    expect(isEdgeInside(size, { x: 10, z: 0, side: 'north' })).toBe(false);
    expect(isEdgeInside(size, { x: 0, z: 8, side: 'west' })).toBe(false);
    expect(isEdgeInside(size, { x: -1, z: 0, side: 'west' })).toBe(false);
    expect(isEdgeInside(size, { x: 0.5, z: 0, side: 'west' })).toBe(false);
  });
});
