/**
 * Endereço dos pedaços (chunks). O pedaço (cx, cz) cobre x em [cx·32, cx·32+32) e
 * z em [cz·32, cz·32+32), cortado na borda do mapa: 1000 = 31·32 + 8, então os pedaços
 * da borda leste e sul são menores que os outros.
 */
import type { Cell, GridSize } from '../grid';
import { CHUNK_SIZE, MAX_MAP_SIZE_V2 } from './constants';
import { intersectRects, mapRect, type CellRect } from './rect';

export type ChunkCoord = { readonly cx: number; readonly cz: number };

export function isValidMapSizeV2(size: GridSize): boolean {
  return (
    Number.isInteger(size.width) &&
    Number.isInteger(size.depth) &&
    size.width >= 1 &&
    size.depth >= 1 &&
    size.width <= MAX_MAP_SIZE_V2 &&
    size.depth <= MAX_MAP_SIZE_V2
  );
}

/** Pedaço que contém a casa. Não confere o mapa: a casa precisa ser válida (veja isInside). */
export function chunkOfCell(cell: Cell): ChunkCoord {
  return { cx: Math.floor(cell.x / CHUNK_SIZE), cz: Math.floor(cell.z / CHUNK_SIZE) };
}

/** Chave estável para Map e Set. */
export function chunkKey(coord: ChunkCoord): string {
  return `${coord.cx},${coord.cz}`;
}

/** Quantos pedaços o mapa tem por linha e por coluna. */
export function chunkGridSize(size: GridSize): { columns: number; rows: number } {
  return {
    columns: Math.ceil(size.width / CHUNK_SIZE),
    rows: Math.ceil(size.depth / CHUNK_SIZE),
  };
}

export function isChunkInside(size: GridSize, coord: ChunkCoord): boolean {
  const { columns, rows } = chunkGridSize(size);
  return (
    Number.isInteger(coord.cx) &&
    Number.isInteger(coord.cz) &&
    coord.cx >= 0 &&
    coord.cz >= 0 &&
    coord.cx < columns &&
    coord.cz < rows
  );
}

/** Casas que o pedaço cobre, já cortadas na borda do mapa. */
export function chunkBounds(size: GridSize, coord: ChunkCoord): CellRect {
  if (!isChunkInside(size, coord)) {
    throw new RangeError(
      `Pedaço (${coord.cx}, ${coord.cz}) fora do mapa ${size.width}×${size.depth}.`,
    );
  }
  const x = coord.cx * CHUNK_SIZE;
  const z = coord.cz * CHUNK_SIZE;
  return {
    x,
    z,
    width: Math.min(CHUNK_SIZE, size.width - x),
    depth: Math.min(CHUNK_SIZE, size.depth - z),
  };
}

/** Todos os pedaços do mapa, linha a linha (cz, depois cx). */
export function listChunks(size: GridSize): ChunkCoord[] {
  const { columns, rows } = chunkGridSize(size);
  const coords: ChunkCoord[] = [];
  for (let cz = 0; cz < rows; cz += 1) {
    for (let cx = 0; cx < columns; cx += 1) coords.push({ cx, cz });
  }
  return coords;
}

/**
 * Pedaços que o retângulo toca, já descontando o que passa da borda do mapa. Custa uma
 * volta por pedaço tocado, nunca por casa: é o que mantém barato pintar e redesenhar.
 */
export function chunksTouchedByRect(size: GridSize, rect: CellRect): ChunkCoord[] {
  const clipped = intersectRects(mapRect(size), rect);
  if (!clipped) return [];
  const first = chunkOfCell(clipped);
  const last = chunkOfCell({ x: clipped.x + clipped.width - 1, z: clipped.z + clipped.depth - 1 });
  const coords: ChunkCoord[] = [];
  for (let cz = first.cz; cz <= last.cz; cz += 1) {
    for (let cx = first.cx; cx <= last.cx; cx += 1) coords.push({ cx, cz });
  }
  return coords;
}

/** Posição da casa dentro do pedaço, linha a linha (z, depois x): a ordem do terreno e do RLE. */
export function localIndex(bounds: CellRect, cell: Cell): number {
  return (cell.z - bounds.z) * bounds.width + (cell.x - bounds.x);
}
