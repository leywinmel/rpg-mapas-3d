/** Grade quadrada do mapa. Uma casa = uma unidade do mundo 3D (eixos x e z). */

/** Tamanho máximo de um lado do mapa, em casas (decisão do usuário: até 100×100). */
export const MAX_MAP_SIZE = 100;

export type Cell = { readonly x: number; readonly z: number };

export type GridSize = { readonly width: number; readonly depth: number };

export function isValidMapSize(size: GridSize): boolean {
  return (
    Number.isInteger(size.width) &&
    Number.isInteger(size.depth) &&
    size.width >= 1 &&
    size.depth >= 1 &&
    size.width <= MAX_MAP_SIZE &&
    size.depth <= MAX_MAP_SIZE
  );
}

export function isInside(size: GridSize, cell: Cell): boolean {
  return (
    Number.isInteger(cell.x) &&
    Number.isInteger(cell.z) &&
    cell.x >= 0 &&
    cell.z >= 0 &&
    cell.x < size.width &&
    cell.z < size.depth
  );
}

/** Índice linear da casa: linha a linha, mesma convenção da névoa no banco (z * largura + x). */
export function cellIndex(size: GridSize, cell: Cell): number {
  if (!isInside(size, cell)) {
    throw new RangeError(`Casa (${cell.x}, ${cell.z}) fora do mapa ${size.width}×${size.depth}.`);
  }
  return cell.z * size.width + cell.x;
}

/** Converte um ponto do mundo 3D (centro da casa em x + 0,5) para a casa da grade. */
export function worldToCell(size: GridSize, worldX: number, worldZ: number): Cell | null {
  const cell = { x: Math.floor(worldX), z: Math.floor(worldZ) };
  return isInside(size, cell) ? cell : null;
}

export function cellCenter(cell: Cell): { x: number; z: number } {
  return { x: cell.x + 0.5, z: cell.z + 0.5 };
}

/** Prende uma casa dentro do mapa (útil ao arrastar um token para fora da borda). */
export function clampCell(size: GridSize, cell: Cell): Cell {
  return {
    x: Math.min(Math.max(Math.round(cell.x), 0), size.width - 1),
    z: Math.min(Math.max(Math.round(cell.z), 0), size.depth - 1),
  };
}

/**
 * Distância em casas para a régua. Diagonal conta como 1 casa (regra padrão de D&D 5e
 * e do Owlbear Rodeo em grade quadrada).
 */
export function distanceInCells(from: Cell, to: Cell): number {
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.z - from.z));
}

/** Todas as casas do retângulo entre dois cantos (inclusive), já presas ao mapa. */
export function cellsInRect(size: GridSize, a: Cell, b: Cell): Cell[] {
  const start = clampCell(size, { x: Math.min(a.x, b.x), z: Math.min(a.z, b.z) });
  const end = clampCell(size, { x: Math.max(a.x, b.x), z: Math.max(a.z, b.z) });
  const cells: Cell[] = [];
  for (let z = start.z; z <= end.z; z += 1) {
    for (let x = start.x; x <= end.x; x += 1) cells.push({ x, z });
  }
  return cells;
}
