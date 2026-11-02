/** Paredes do v2: de qual pedaço cada uma é e como ela é identificada. */
import { type Cell, type GridEdge, type GridSize } from '../grid';
import { chunkOfCell, type ChunkCoord } from './chunks';
import type { MapWall } from './schema';

/**
 * Uma parede é identificada pela aresta e pelo degrau da base: duas paredes na mesma aresta
 * em degraus diferentes são andares empilhados; no mesmo degrau, uma substitui a outra.
 */
export type WallKey = GridEdge & { readonly level: number };

export function wallKey(wall: WallKey): string {
  return `${wall.x},${wall.z},${wall.side},${wall.level}`;
}

/**
 * Casa que decide de qual pedaço a aresta é. Em geral é a casa (x, z) da própria aresta; as
 * arestas da borda leste (x = largura) e sul (z = profundidade) não têm casa de dentro com
 * esse endereço, então ficam com a casa de dentro vizinha. A aresta entre dois pedaços é
 * do pedaço de x ou z maiores, e nunca existe aresta sem dono. Vale para arestas dentro do mapa.
 */
export function wallOwnerCell(size: GridSize, edge: GridEdge): Cell {
  if (edge.side === 'north' && edge.z === size.depth) return { x: edge.x, z: edge.z - 1 };
  if (edge.side === 'west' && edge.x === size.width) return { x: edge.x - 1, z: edge.z };
  return { x: edge.x, z: edge.z };
}

/** Pedaço que guarda a parede (e, com ele, todas as paredes empilhadas na mesma aresta). */
export function wallOwnerChunk(size: GridSize, edge: GridEdge): ChunkCoord {
  return chunkOfCell(wallOwnerCell(size, edge));
}

export function sameWallKey(a: WallKey, b: WallKey): boolean {
  return a.x === b.x && a.z === b.z && a.side === b.side && a.level === b.level;
}

/** Só a identidade, sem estilo nem altura (útil para remover). */
export function keyOfWall(wall: MapWall): WallKey {
  return { x: wall.x, z: wall.z, side: wall.side, level: wall.level };
}
