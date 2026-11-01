import { describe, expect, it } from 'vitest';
import { cellsOnLine } from './stroke-line';

describe('cellsOnLine', () => {
  it('shouldReturnASingleCellWhenBothEndsMatch', () => {
    expect(cellsOnLine({ x: 3, z: 3 }, { x: 3, z: 3 })).toEqual([{ x: 3, z: 3 }]);
  });

  it('shouldWalkStraightAndDiagonalLinesWithoutGaps', () => {
    expect(cellsOnLine({ x: 0, z: 0 }, { x: 3, z: 0 })).toHaveLength(4);
    expect(cellsOnLine({ x: 2, z: 2 }, { x: 0, z: 0 })).toEqual([
      { x: 2, z: 2 },
      { x: 1, z: 1 },
      { x: 0, z: 0 },
    ]);
  });

  it('shouldMoveAtMostOneCellPerStep', () => {
    const cells = cellsOnLine({ x: 0, z: 0 }, { x: 7, z: -3 });
    cells.slice(1).forEach((cell, index) => {
      const previous = cells[index]!;
      expect(Math.abs(cell.x - previous.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(cell.z - previous.z)).toBeLessThanOrEqual(1);
    });
    expect(cells.at(-1)).toEqual({ x: 7, z: -3 });
  });
});
