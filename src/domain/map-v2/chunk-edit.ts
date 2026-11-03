/**
 * Ferramentas internas das operações do v2: trocar pedaços sem copiar o mapa, andar pelas
 * casas de uma parte do pedaço e achar a peça de chão na paleta. Não entra no index.ts: quem
 * edita o mapa usa as operações (operations.ts, terrain-height.ts, resize.ts).
 */
import type { Cell, GridSize } from '../grid';
import type { MapResult } from '../map-document';
import { chunkKey, chunksTouchedByRect } from './chunks';
import { getChunk } from './model';
import { intersectRects, mapRect, rectFromCorners, type CellRect } from './rect';
import { NO_FLOOR_INDEX } from './terrain';
import type { MapChunk, MapModel } from './types';
import { fail, ok } from './validation';

export function withChunks(model: MapModel, replaced: ReadonlyMap<string, MapChunk>): MapModel {
  if (replaced.size === 0) return model;
  const chunks = new Map(model.chunks);
  for (const [key, chunk] of replaced) chunks.set(key, chunk);
  return { ...model, chunks };
}

export function replaceChunk(model: MapModel, chunk: MapChunk): MapModel {
  return withChunks(model, new Map([[chunkKey(chunk.coord), chunk]]));
}

/** Aplica a edição a cada pedaço que a área toca; `edit` devolve o mesmo pedaço se nada mudar. */
export function editArea(
  model: MapModel,
  area: CellRect,
  edit: (chunk: MapChunk) => MapChunk,
): MapModel {
  const replaced = new Map<string, MapChunk>();
  for (const coord of chunksTouchedByRect(model.size, area)) {
    const chunk = getChunk(model, coord);
    const edited = edit(chunk);
    if (edited !== chunk) replaced.set(chunkKey(coord), edited);
  }
  return withChunks(model, replaced);
}

/** Índices (dentro do pedaço) das casas da parte, linha a linha. */
export function forEachIndex(
  bounds: CellRect,
  part: CellRect,
  visit: (index: number) => void,
): void {
  for (let z = part.z; z < part.z + part.depth; z += 1) {
    const rowStart = (z - bounds.z) * bounds.width + (part.x - bounds.x);
    for (let offset = 0; offset < part.width; offset += 1) visit(rowStart + offset);
  }
}

/** A área pedida, cortada na borda do mapa: arrastar o pincel para fora do mapa não é erro. */
export function resolveArea(size: GridSize, from: Cell, to: Cell): MapResult<CellRect> {
  if (![from.x, from.z, to.x, to.z].every(Number.isInteger)) {
    return fail(['A área do terreno precisa ter casas inteiras.']);
  }
  const area = intersectRects(mapRect(size), rectFromCorners(from, to));
  return area ? ok(area) : fail(['A área está fora do mapa.']);
}

/** Índice da peça na paleta; se ela ainda não está lá, a paleta ganha a peça no fim. */
export function resolveTile(
  palette: readonly string[],
  tile: string | null,
): { palette: readonly string[]; index: number } {
  if (tile === null) return { palette, index: NO_FLOOR_INDEX };
  const known = palette.indexOf(tile);
  if (known >= 0) return { palette, index: known + 1 };
  return { palette: [...palette, tile], index: palette.length + 1 };
}
