/**
 * Recorte do mapa para exportar só uma área (a vista atual ou um retângulo) e, para o jogador,
 * só o que ele vê. As regras de "o que sai" são as mesmas do recorte da névoa no banco
 * (redact_fogged_chunk): a casa fora vira buraco, a parede some quando as duas casas dos lados
 * estão fora e a peça some quando todas as casas dela estão fora.
 */
import type { Cell } from '../grid';
import {
  chunksTouchedByRect,
  getChunk,
  intersectRects,
  mapRect,
  MAX_FOOTPRINT,
  NO_FLOOR_INDEX,
  occupiedCells,
  rectContains,
  type CellRect,
  type MapChunk,
  type MapModel,
  type MapWall,
} from '../map-v2';

export type CropOptions = {
  /** Área exportada, em casas; o que passa da borda do mapa é ignorado. */
  readonly rect: CellRect;
  /** Casa que quem exporta não pode ver (a névoa do jogador). Sem a função, nada é escondido. */
  readonly isHidden?: (cell: Cell) => boolean;
};

type Keep = (cell: Cell) => boolean;

/** A casa do outro lado da aresta da parede ("north" separa z de z - 1; "west", x de x - 1). */
function wallNeighbor(wall: MapWall): Cell {
  return wall.side === 'north' ? { x: wall.x, z: wall.z - 1 } : { x: wall.x - 1, z: wall.z };
}

function cropTerrain(chunk: MapChunk, keep: Keep): MapChunk['terrain'] {
  const { bounds, terrain } = chunk;
  const tiles = terrain.tiles.slice();
  const heights = terrain.heights.slice();
  for (let index = 0; index < tiles.length; index += 1) {
    const cell = {
      x: bounds.x + (index % bounds.width),
      z: bounds.z + Math.floor(index / bounds.width),
    };
    if (keep(cell)) continue;
    tiles[index] = NO_FLOOR_INDEX;
    heights[index] = 0;
  }
  return { palette: terrain.palette, tiles, heights };
}

function hasContent(chunk: MapChunk): boolean {
  return (
    chunk.walls.length > 0 ||
    chunk.pieces.length > 0 ||
    chunk.terrain.tiles.some((tile) => tile !== NO_FLOOR_INDEX)
  );
}

function cropChunk(chunk: MapChunk, keep: Keep): MapChunk {
  return {
    coord: chunk.coord,
    bounds: chunk.bounds,
    terrain: cropTerrain(chunk, keep),
    walls: chunk.walls.filter((wall) => keep(wall) || keep(wallNeighbor(wall))),
    pieces: chunk.pieces.filter((piece) => occupiedCells(piece).some(keep)),
  };
}

/**
 * Os pedaços da área, recortados, sem os que ficaram vazios. Olha também os pedaços logo a oeste
 * e ao norte (peça grande ancorada no vizinho entra na área) e a leste e ao sul (a parede da
 * borda da área pode morar no pedaço vizinho).
 */
export function cropMapChunks(model: MapModel, options: CropOptions): MapChunk[] {
  const area = intersectRects(mapRect(model.size), options.rect);
  if (!area) return [];
  const { isHidden } = options;
  const keep: Keep = (cell) => rectContains(area, cell) && !isHidden?.(cell);
  const reach = MAX_FOOTPRINT - 1;
  const search = {
    x: area.x - reach,
    z: area.z - reach,
    width: area.width + reach + 1,
    depth: area.depth + reach + 1,
  };
  const chunks: MapChunk[] = [];
  for (const coord of chunksTouchedByRect(model.size, search)) {
    const chunk = getChunk(model, coord);
    // Pedaço todo dentro da área e sem névoa sai como está, sem copiar o terreno.
    const overlap = intersectRects(area, chunk.bounds);
    const untouched =
      !isHidden && overlap?.width === chunk.bounds.width && overlap.depth === chunk.bounds.depth;
    const cropped = untouched ? chunk : cropChunk(chunk, keep);
    if (hasContent(cropped)) chunks.push(cropped);
  }
  return chunks;
}
