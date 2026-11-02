/** O mapa v2 em memória: criar um mapa vazio e consultar pedaços e terreno. */
import { isInside, type Cell, type GridSize } from '../grid';
import { DEFAULT_AMBIENCE } from '../map-document';
import {
  chunkBounds,
  chunkKey,
  chunkOfCell,
  chunksTouchedByRect,
  isValidMapSizeV2,
  listChunks,
  localIndex,
  type ChunkCoord,
} from './chunks';
import { DEFAULT_FLOOR_TILE, MAP_V2_VERSION, MAX_MAP_SIZE_V2 } from './constants';
import { anchorWindow, pieceRect } from './footprint';
import { rectContains } from './rect';
import { catalogKeySchema, type MapPiece } from './schema';
import { createUniformTerrain, tileAtIndex } from './terrain';
import type { MapChunk, MapModel } from './types';

/**
 * Mapa novo: chão inteiro com a peça escolhida, no nível zero, sem paredes nem peças. Tamanho
 * e peça inválidos são erro de programação (a tela já conferiu antes), como em cellIndex.
 */
export function createEmptyMap(size: GridSize, floorTile: string = DEFAULT_FLOOR_TILE): MapModel {
  if (!isValidMapSizeV2(size)) {
    throw new RangeError(
      `Tamanho ${size.width}×${size.depth} inválido: use de 1 a ${MAX_MAP_SIZE_V2} casas por lado.`,
    );
  }
  if (!catalogKeySchema.safeParse(floorTile).success) {
    throw new RangeError(`Peça de chão inválida: "${floorTile}".`);
  }
  const chunks = new Map<string, MapChunk>();
  for (const coord of listChunks(size)) {
    const bounds = chunkBounds(size, coord);
    const terrain = createUniformTerrain(bounds.width * bounds.depth, floorTile);
    chunks.set(chunkKey(coord), { coord, bounds, terrain, walls: [], pieces: [] });
  }
  return {
    size: { width: size.width, depth: size.depth },
    header: { version: MAP_V2_VERSION, ambience: { ...DEFAULT_AMBIENCE } },
    chunks,
  };
}

/** O pedaço, que sempre existe num mapa íntegro; pedir um fora do mapa é erro de programação. */
export function getChunk(model: MapModel, coord: ChunkCoord): MapChunk {
  const chunk = model.chunks.get(chunkKey(coord));
  if (!chunk) {
    throw new RangeError(`Pedaço (${coord.cx}, ${coord.cz}) não existe neste mapa.`);
  }
  return chunk;
}

/** Pedaço que contém a casa, ou undefined quando a casa está fora do mapa. */
export function chunkAtCell(model: MapModel, cell: Cell): MapChunk | undefined {
  return isInside(model.size, cell) ? getChunk(model, chunkOfCell(cell)) : undefined;
}

export type TerrainCell = { readonly tile: string | null; readonly height: number };

/** Chão e altura da casa em tempo constante, ou null quando a casa está fora do mapa. */
export function terrainAt(model: MapModel, cell: Cell): TerrainCell | null {
  const chunk = chunkAtCell(model, cell);
  if (!chunk) return null;
  const index = localIndex(chunk.bounds, cell);
  return { tile: tileAtIndex(chunk.terrain, index), height: chunk.terrain.heights[index] ?? 0 };
}

/**
 * Peças que ocupam a casa, de baixo para cima (por degrau da base; empate pela ordem em que
 * foram postas), contando as que vêm de pedaços vizinhos: a peça fica no pedaço da âncora e
 * pode avançar para o vizinho. Custa o número de peças de até quatro pedaços, nunca o do mapa todo.
 */
export function piecesOccupyingCell(model: MapModel, cell: Cell): MapPiece[] {
  if (!isInside(model.size, cell)) return [];
  const found: MapPiece[] = [];
  for (const coord of chunksTouchedByRect(model.size, anchorWindow(cell))) {
    for (const piece of getChunk(model, coord).pieces) {
      if (rectContains(pieceRect(piece), cell)) found.push(piece);
    }
  }
  return found.sort((a, b) => a.level - b.level);
}
