/**
 * Mudar o tamanho de um mapa v2. O canto noroeste (0, 0) fica parado: crescer abre chão liso
 * a leste e ao sul, diminuir corta por lá. O que sai do mapa some: casas, peças que deixam de
 * caber inteiras e paredes de arestas que deixam de existir.
 *
 * Os pedaços que continuam iguais mantêm a mesma referência, como em qualquer operação: a
 * gravação manda só os que mudaram, e o banco apaga sozinho as linhas dos que saíram do mapa.
 */
import { isEdgeInside, type GridSize } from '../grid';
import type { MapResult } from '../map-document';
import { chunkBounds, chunkKey, isValidMapSizeV2, listChunks, type ChunkCoord } from './chunks';
import { forEachIndex, resolveTile } from './chunk-edit';
import { DEFAULT_FLOOR_TILE, MAX_MAP_SIZE_V2, MAX_WALLS_PER_CHUNK } from './constants';
import { pieceFitsInMap } from './footprint';
import { createUniformChunk } from './model';
import { intersectRects, type CellRect } from './rect';
import type { MapWall } from './schema';
import type { ChunkTerrain } from './terrain';
import type { MapChunk, MapModel } from './types';
import { fail, ok } from './validation';
import { wallOwnerChunk } from './walls';

function sameRect(a: CellRect, b: CellRect): boolean {
  return a.x === b.x && a.z === b.z && a.width === b.width && a.depth === b.depth;
}

/** Terreno do pedaço com o novo recorte: o que já existia é copiado, o que é novo vira chão liso. */
function reshapeTerrain(terrain: ChunkTerrain, from: CellRect, to: CellRect): ChunkTerrain {
  const { palette, index: defaultIndex } = resolveTile(terrain.palette, DEFAULT_FLOOR_TILE);
  const cellCount = to.width * to.depth;
  const tiles = new Uint16Array(cellCount).fill(defaultIndex);
  const heights = new Uint8Array(cellCount);
  const kept = intersectRects(from, to);
  if (kept) {
    const sources: number[] = [];
    forEachIndex(from, kept, (index) => sources.push(index));
    let position = 0;
    forEachIndex(to, kept, (index) => {
      const source = sources[position]!;
      tiles[index] = terrain.tiles[source]!;
      heights[index] = terrain.heights[source]!;
      position += 1;
    });
  }
  return { palette, tiles, heights };
}

/**
 * As paredes que continuam no mapa, já no pedaço dono pelo tamanho novo: a aresta da borda
 * leste e sul é da casa de dentro, e ao crescer ela passa para a casa que surgiu do outro lado.
 */
function wallsByOwner(model: MapModel, size: GridSize): Map<string, MapWall[]> {
  const owners = new Map<string, MapWall[]>();
  for (const chunk of model.chunks.values()) {
    for (const wall of chunk.walls) {
      if (!isEdgeInside(size, wall)) continue;
      const key = chunkKey(wallOwnerChunk(size, wall));
      const list = owners.get(key);
      if (list) list.push(wall);
      else owners.set(key, [wall]);
    }
  }
  return owners;
}

function sameWalls(a: readonly MapWall[], b: readonly MapWall[]): boolean {
  return a.length === b.length && a.every((wall, index) => wall === b[index]);
}

type ResizeContext = {
  readonly model: MapModel;
  readonly size: GridSize;
  readonly walls: ReadonlyMap<string, MapWall[]>;
};

/** O pedaço no tamanho novo; o MESMO objeto quando nada nele mudou. */
function resizeChunk(context: ResizeContext, coord: ChunkCoord): MapChunk {
  const key = chunkKey(coord);
  const old = context.model.chunks.get(key);
  const walls = context.walls.get(key) ?? [];
  if (!old) {
    const fresh = createUniformChunk(context.size, coord);
    return walls.length === 0 ? fresh : { ...fresh, walls };
  }
  const bounds = chunkBounds(context.size, coord);
  const pieces = old.pieces.filter((piece) => pieceFitsInMap(context.size, piece));
  const sameBounds = sameRect(old.bounds, bounds);
  const unchanged =
    sameBounds && pieces.length === old.pieces.length && sameWalls(walls, old.walls);
  if (unchanged) return old;
  const terrain = sameBounds ? old.terrain : reshapeTerrain(old.terrain, old.bounds, bounds);
  return {
    coord,
    bounds,
    terrain,
    walls: sameWalls(walls, old.walls) ? old.walls : walls,
    pieces: pieces.length === old.pieces.length ? old.pieces : pieces,
  };
}

/**
 * O mapa com o tamanho novo. Recusa tamanho fora do limite e o caso raro de um pedaço ganhar
 * paredes demais (as da borda que passam para ele ao crescer).
 */
export function resizeMap(model: MapModel, size: GridSize): MapResult<MapModel> {
  if (!isValidMapSizeV2(size)) {
    return fail([`O mapa precisa ter de 1 a ${MAX_MAP_SIZE_V2} casas por lado.`]);
  }
  if (size.width === model.size.width && size.depth === model.size.depth) return ok(model);
  const context = { model, size, walls: wallsByOwner(model, size) };
  const chunks = new Map<string, MapChunk>();
  for (const coord of listChunks(size)) {
    const chunk = resizeChunk(context, coord);
    if (chunk.walls.length > MAX_WALLS_PER_CHUNK) {
      return fail([`Este pedaço do mapa passaria do máximo de ${MAX_WALLS_PER_CHUNK} paredes.`]);
    }
    chunks.set(chunkKey(coord), chunk);
  }
  return ok({ ...model, size: { width: size.width, depth: size.depth }, chunks });
}
