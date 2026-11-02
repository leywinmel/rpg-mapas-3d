/** Retângulos de casas: a base dos pedaços, das áreas de pintura e das peças de várias casas. */
import type { Cell, GridSize } from '../grid';

/**
 * (x, z) é a casa de menor x e menor z; o retângulo ocupa as casas
 * x..x+width-1 e z..z+depth-1.
 */
export type CellRect = {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
};

/** Retângulo entre dois cantos, na ordem que vier (arrastar de baixo para cima também vale). */
export function rectFromCorners(a: Cell, b: Cell): CellRect {
  return {
    x: Math.min(a.x, b.x),
    z: Math.min(a.z, b.z),
    width: Math.abs(a.x - b.x) + 1,
    depth: Math.abs(a.z - b.z) + 1,
  };
}

export function rectContains(rect: CellRect, cell: Cell): boolean {
  return (
    cell.x >= rect.x &&
    cell.z >= rect.z &&
    cell.x < rect.x + rect.width &&
    cell.z < rect.z + rect.depth
  );
}

/** Parte comum aos dois retângulos, ou null quando não se tocam. */
export function intersectRects(a: CellRect, b: CellRect): CellRect | null {
  const x = Math.max(a.x, b.x);
  const z = Math.max(a.z, b.z);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.z + a.depth, b.z + b.depth);
  return right > x && bottom > z ? { x, z, width: right - x, depth: bottom - z } : null;
}

export function mapRect(size: GridSize): CellRect {
  return { x: 0, z: 0, width: size.width, depth: size.depth };
}

/** O retângulo inteiro está dentro do mapa? */
export function isRectInside(size: GridSize, rect: CellRect): boolean {
  return (
    Number.isInteger(rect.x) &&
    Number.isInteger(rect.z) &&
    rect.x >= 0 &&
    rect.z >= 0 &&
    rect.x + rect.width <= size.width &&
    rect.z + rect.depth <= size.depth
  );
}

/** As casas do retângulo, linha a linha (z, depois x). */
export function rectCells(rect: CellRect): Cell[] {
  const cells: Cell[] = [];
  for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) cells.push({ x, z });
  }
  return cells;
}
