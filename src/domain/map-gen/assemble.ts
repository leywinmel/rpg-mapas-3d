/**
 * Montagem direta do MapModel v2 a partir de paredes, peças e do chão do mapa inteiro. Serve a
 * todos os geradores (vilas, masmorras, cavernas, desertos): eles decidem o que vai onde e
 * este módulo reparte em pedaços, sem passar pelas operações, que conferem o mapa inteiro a
 * cada peça.
 */
import type { GridSize } from '../grid';
import {
  chunkBounds,
  chunkKey,
  chunkOfCell,
  listChunks,
  MAX_PIECES_PER_CHUNK,
  MAX_WALLS_PER_CHUNK,
  NO_FLOOR_INDEX,
  wallKey,
  wallOwnerChunk,
  type MapChunk,
  type MapHeader,
  type MapModel,
  type MapPiece,
  type MapWall,
} from '../map-v2';

/** Chão do mapa todo: a peça de cada casa como índice em `keys`, linha a linha (null = sem chão). */
export type TerrainGrid = {
  readonly keys: readonly (string | null)[];
  readonly tiles: Uint16Array;
};

export type AssembledMap = {
  readonly model: MapModel;
  readonly walls: number;
  readonly pieces: number;
  /** Peças ou paredes que não couberam no limite de um pedaço (deve ser zero). */
  readonly dropped: number;
};

export type MapAssembler = {
  /** Aresta já ocupada fica com a primeira parede: o domínio aceita uma só por aresta. */
  readonly addWall: (wall: MapWall) => void;
  readonly addPiece: (piece: Omit<MapPiece, 'id'>) => void;
  readonly finish: (terrain: TerrainGrid, header: MapHeader) => AssembledMap;
};

/** Pedaço em construção: os arrays ainda podem ser mexidos, ninguém mais os tem. */
type Draft = { walls: MapWall[]; pieces: MapPiece[]; wallKeys: Set<string> };

/** Lista de chaves de chão sem repetição, com o índice de cada uma. */
export function createTileKeys() {
  const keys: (string | null)[] = [];
  const indexOf = new Map<string | null, number>();
  const index = (key: string | null) => {
    let found = indexOf.get(key);
    if (found === undefined) {
      found = keys.push(key) - 1;
      indexOf.set(key, found);
    }
    return found;
  };
  return { keys, index };
}

/** Terreno de um pedaço a partir do terreno do mapa todo (paleta só com o que ele usa). */
function chunkTerrain(
  terrain: TerrainGrid,
  size: GridSize,
  bounds: MapChunk['bounds'],
): MapChunk['terrain'] {
  const palette: string[] = [];
  const local = new Map<number, number>();
  const tiles = new Uint16Array(bounds.width * bounds.depth);
  let offset = 0;
  for (let z = bounds.z; z < bounds.z + bounds.depth; z += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      const global = terrain.tiles[z * size.width + x]!;
      const key = terrain.keys[global]!;
      let paletteIndex = key === null ? NO_FLOOR_INDEX : local.get(global);
      if (paletteIndex === undefined) {
        // O índice 0 é "sem chão": a peça i da paleta vale i + 1, o novo tamanho dela.
        paletteIndex = palette.push(key);
        local.set(global, paletteIndex);
      }
      tiles[offset] = paletteIndex;
      offset += 1;
    }
  }
  return { palette, tiles, heights: new Uint8Array(tiles.length) };
}

export function createAssembler(size: GridSize): MapAssembler {
  const drafts = new Map<string, Draft>();
  let dropped = 0;
  const draftAt = (key: string): Draft => {
    const found = drafts.get(key);
    if (found) return found;
    const draft: Draft = { walls: [], pieces: [], wallKeys: new Set() };
    drafts.set(key, draft);
    return draft;
  };

  const addWall = (wall: MapWall) => {
    const draft = draftAt(chunkKey(wallOwnerChunk(size, wall)));
    const key = wallKey(wall);
    if (draft.wallKeys.has(key)) return;
    if (draft.walls.length >= MAX_WALLS_PER_CHUNK) {
      dropped += 1;
      return;
    }
    draft.walls.push(wall);
    draft.wallKeys.add(key);
  };

  /** Id curto e único no mapa: o pedaço da âncora e a ordem dentro dele. */
  const addPiece = (piece: Omit<MapPiece, 'id'>) => {
    const coord = chunkOfCell(piece);
    const draft = draftAt(chunkKey(coord));
    if (draft.pieces.length >= MAX_PIECES_PER_CHUNK) {
      dropped += 1;
      return;
    }
    draft.pieces.push({ id: `g${coord.cx}.${coord.cz}.${draft.pieces.length}`, ...piece });
  };

  const finish = (terrain: TerrainGrid, header: MapHeader): AssembledMap => {
    const chunks = new Map<string, MapChunk>();
    let walls = 0;
    let pieces = 0;
    for (const coord of listChunks(size)) {
      const key = chunkKey(coord);
      const bounds = chunkBounds(size, coord);
      const draft = drafts.get(key) ?? { walls: [], pieces: [] };
      walls += draft.walls.length;
      pieces += draft.pieces.length;
      chunks.set(key, {
        coord,
        bounds,
        terrain: chunkTerrain(terrain, size, bounds),
        walls: draft.walls,
        pieces: draft.pieces,
      });
    }
    return { model: { size: { ...size }, header, chunks }, walls, pieces, dropped };
  };

  return { addWall, addPiece, finish };
}
