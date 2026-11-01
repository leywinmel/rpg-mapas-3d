/**
 * Casas entre dois pontos do arraste. O navegador entrega o movimento do mouse
 * em saltos; sem preencher o meio, um arraste rápido deixaria buracos no chão.
 */
import type { Cell } from '@/domain';

/** Linha de casas de `from` até `to` (Bresenham), sem repetir e incluindo as duas pontas. */
export function cellsOnLine(from: Cell, to: Cell): Cell[] {
  const cells: Cell[] = [];
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  const stepX = from.x < to.x ? 1 : -1;
  const stepZ = from.z < to.z ? 1 : -1;
  let error = dx - dz;
  let { x, z } = from;
  for (;;) {
    cells.push({ x, z });
    if (x === to.x && z === to.z) return cells;
    const doubled = error * 2;
    if (doubled > -dz) {
      error -= dz;
      x += stepX;
    }
    if (doubled < dx) {
      error += dx;
      z += stepZ;
    }
  }
}
