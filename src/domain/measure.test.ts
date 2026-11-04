import { measureCells, METERS_PER_CELL } from './measure';

describe('measureCells', () => {
  it('shouldBeZeroOnTheSameCell', () => {
    expect(measureCells({ x: 3, z: 4 }, { x: 3, z: 4 })).toEqual({ cells: 0, meters: 0 });
  });

  it('shouldCountStraightLinesCellByCell', () => {
    expect(measureCells({ x: 0, z: 0 }, { x: 6, z: 0 })).toEqual({ cells: 6, meters: 9 });
    expect(measureCells({ x: 2, z: 9 }, { x: 2, z: 1 }).cells).toBe(8);
  });

  it('shouldCountDiagonalsAsOneCellEach', () => {
    expect(measureCells({ x: 0, z: 0 }, { x: 4, z: 4 }).cells).toBe(4);
  });

  it('shouldTakeTheLongestAxisOnMixedMoves', () => {
    const measured = measureCells({ x: 10, z: 10 }, { x: 3, z: 12 });
    expect(measured.cells).toBe(7);
    expect(measured.meters).toBe(7 * METERS_PER_CELL);
  });

  it('shouldBeSymmetric', () => {
    const a = { x: 1, z: 30 };
    const b = { x: 999, z: 0 };
    expect(measureCells(a, b)).toEqual(measureCells(b, a));
    expect(measureCells(a, b).cells).toBe(998);
  });
});
