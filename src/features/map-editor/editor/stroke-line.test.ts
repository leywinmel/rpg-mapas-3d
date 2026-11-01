import { describe, expect, it } from 'vitest';
import type { Cell } from '@/domain';
import { cellsOnLine } from './stroke-line';

const SPAN = 5;

function sharesASide(a: Cell, b: Cell): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z) === 1;
}

describe('cellsOnLine', () => {
  it('shouldReturnASingleCellWhenBothEndsMatch', () => {
    expect(cellsOnLine({ x: 3, z: 3 }, { x: 3, z: 3 })).toEqual([{ x: 3, z: 3 }]);
  });

  it('shouldWalkStraightLines', () => {
    expect(cellsOnLine({ x: 0, z: 0 }, { x: 3, z: 0 })).toEqual([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
    ]);
  });

  it('shouldTurnDiagonalsIntoStairsThatShareASide', () => {
    const cells = cellsOnLine({ x: 2, z: 2 }, { x: 0, z: 0 });
    expect(cells).toHaveLength(5);
    cells.slice(1).forEach((cell, index) => expect(sharesASide(cells[index]!, cell)).toBe(true));
  });

  it('shouldReachEveryTargetOneSideAtATime', () => {
    for (let x = -SPAN; x <= SPAN; x += 1) {
      for (let z = -SPAN; z <= SPAN; z += 1) {
        const cells = cellsOnLine({ x: 0, z: 0 }, { x, z });
        expect(cells).toHaveLength(Math.abs(x) + Math.abs(z) + 1);
        expect(cells.at(-1)).toEqual({ x, z });
        cells.slice(1).forEach((cell, index) => {
          expect(sharesASide(cells[index]!, cell)).toBe(true);
        });
      }
    }
  });
});
