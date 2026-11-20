/**
 * O chão que mais aparece na borda do mapa. A paisagem em volta (RPG-40) pinta o chão dela com
 * a cor desse piso, para a areia, a água ou a pedra do mapa continuarem fora dele sem emenda.
 */
import type { Cell } from '../grid';
import { terrainAt } from './model';
import type { MapModel } from './types';

function borderCells(model: MapModel): Cell[] {
  const { width, depth } = model.size;
  const cells: Cell[] = [];
  for (let x = 0; x < width; x += 1) {
    cells.push({ x, z: 0 });
    if (depth > 1) cells.push({ x, z: depth - 1 });
  }
  for (let z = 1; z < depth - 1; z += 1) {
    cells.push({ x: 0, z });
    if (width > 1) cells.push({ x: width - 1, z });
  }
  return cells;
}

/** Piso mais comum nas casas da borda; casa sem chão não conta. Null quando a borda é vazia. */
export function dominantEdgeTile(model: MapModel): string | null {
  const counts = new Map<string, number>();
  for (const cell of borderCells(model)) {
    const tile = terrainAt(model, cell)?.tile;
    if (tile) counts.set(tile, (counts.get(tile) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [tile, count] of counts) {
    if (count <= bestCount) continue;
    best = tile;
    bestCount = count;
  }
  return best;
}
