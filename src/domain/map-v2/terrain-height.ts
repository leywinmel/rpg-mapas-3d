/**
 * Altura do terreno: pôr uma altura fixa ou subir/descer degraus (o pincel de altura).
 *
 * Decisão 13 do usuário (03/11): o que está APOIADO no chão sobe e desce junto com ele, como no
 * v1. "Apoiado" quer dizer base no topo do chão: para uma peça, o degrau da base é a maior altura
 * entre as casas que ela ocupa (é onde o editor a põe); para uma parede, a maior das duas casas
 * que a aresta separa. Depois da mudança, o que estava apoiado continua apoiado no novo ponto
 * mais alto embaixo dele. Assim uma peça de várias casas acompanha o pincel casa a casa (sem
 * recusar o traço) e nunca fica enterrada nem flutuando. O que não estava apoiado (peça
 * empilhada, andar de cima) fica onde está: quem o segura é a peça de baixo, não o chão.
 */
import type { Cell } from '../grid';
import type { MapResult } from '../map-document';
import { chunkKey, chunksTouchedByRect } from './chunks';
import { editArea, forEachIndex, resolveArea, withChunks } from './chunk-edit';
import { MAX_FOOTPRINT, MAX_TERRAIN_HEIGHT } from './constants';
import { pieceRect } from './footprint';
import { getChunk, terrainAt } from './model';
import { intersectRects, rectCells, type CellRect } from './rect';
import type { MapPiece, MapWall } from './schema';
import { NO_FLOOR_INDEX } from './terrain';
import type { MapChunk, MapModel } from './types';
import { fail, ok } from './validation';

export type TerrainHeightChange = {
  /** Dois cantos do retângulo, em qualquer ordem; para uma casa só, use o mesmo nos dois. */
  readonly from: Cell;
  readonly to: Cell;
  /** Altura em degraus, de 0 a MAX_TERRAIN_HEIGHT. */
  readonly height: number;
};

export type TerrainHeightStep = {
  readonly from: Cell;
  readonly to: Cell;
  /** Degraus a subir (positivo) ou descer (negativo). O resultado fica entre 0 e o máximo. */
  readonly delta: number;
};

type HeightRule = (current: number) => number;

function clampHeight(height: number): number {
  return Math.min(Math.max(height, 0), MAX_TERRAIN_HEIGHT);
}

function setHeightsInChunk(chunk: MapChunk, area: CellRect, rule: HeightRule): MapChunk {
  const part = intersectRects(chunk.bounds, area);
  if (!part) return chunk;
  const heights = chunk.terrain.heights.slice();
  let changed = false;
  forEachIndex(chunk.bounds, part, (index) => {
    // Altura só vale onde há chão: casa sem chão fica no zero.
    if (chunk.terrain.tiles[index] === NO_FLOOR_INDEX) return;
    const next = rule(heights[index] ?? 0);
    if (heights[index] === next) return;
    heights[index] = next;
    changed = true;
  });
  return changed ? { ...chunk, terrain: { ...chunk.terrain, heights } } : chunk;
}

/** A maior altura entre as casas (as de fora do mapa não contam). */
function restingLevel(model: MapModel, cells: readonly Cell[]): number {
  let highest = 0;
  for (const cell of cells) highest = Math.max(highest, terrainAt(model, cell)?.height ?? 0);
  return highest;
}

/** As duas casas que a aresta separa: a parede apoia na mais alta delas. */
function cellsBesideEdge(wall: MapWall): Cell[] {
  const other = wall.side === 'north' ? { x: wall.x, z: wall.z - 1 } : { x: wall.x - 1, z: wall.z };
  return [other, { x: wall.x, z: wall.z }];
}

function touchesArea(cells: readonly Cell[], area: CellRect): boolean {
  return cells.some(
    (cell) =>
      cell.x >= area.x &&
      cell.z >= area.z &&
      cell.x < area.x + area.width &&
      cell.z < area.z + area.depth,
  );
}

type Heights = { readonly before: MapModel; readonly after: MapModel; readonly area: CellRect };

/** Nova base do que estava apoiado no chão das casas; o mesmo número quando nada muda. */
function carriedLevel(level: number, cells: readonly Cell[], heights: Heights): number {
  if (!touchesArea(cells, heights.area)) return level;
  if (level !== restingLevel(heights.before, cells)) return level;
  return restingLevel(heights.after, cells);
}

function carryPieces(pieces: readonly MapPiece[], heights: Heights): readonly MapPiece[] {
  let changed = false;
  const next = pieces.map((piece) => {
    const level = carriedLevel(piece.level, rectCells(pieceRect(piece)), heights);
    if (level === piece.level) return piece;
    changed = true;
    return { ...piece, level };
  });
  return changed ? next : pieces;
}

function carryWalls(walls: readonly MapWall[], heights: Heights): readonly MapWall[] {
  let changed = false;
  const next = walls.map((wall) => {
    const level = carriedLevel(wall.level, cellsBesideEdge(wall), heights);
    if (level === wall.level) return wall;
    changed = true;
    return { ...wall, level };
  });
  return changed ? next : walls;
}

/**
 * Leva junto o que estava apoiado no chão da área. Olha os pedaços onde mora o que pode tocar a
 * área: peças com âncora até MAX_FOOTPRINT - 1 casas a oeste ou ao norte, e paredes das arestas
 * da borda leste e sul da área (que são de uma casa logo depois dela).
 */
function carryRestingObjects(heights: Heights): MapModel {
  const { after, area } = heights;
  const reach = MAX_FOOTPRINT - 1;
  const search = {
    x: area.x - reach,
    z: area.z - reach,
    width: area.width + reach + 1,
    depth: area.depth + reach + 1,
  };
  const replaced = new Map<string, MapChunk>();
  for (const coord of chunksTouchedByRect(after.size, search)) {
    const chunk = getChunk(after, coord);
    const pieces = carryPieces(chunk.pieces, heights);
    const walls = carryWalls(chunk.walls, heights);
    if (pieces !== chunk.pieces || walls !== chunk.walls) {
      replaced.set(chunkKey(coord), { ...chunk, pieces, walls });
    }
  }
  return withChunks(after, replaced);
}

function changeHeights(
  model: MapModel,
  corners: { from: Cell; to: Cell },
  rule: HeightRule,
): MapResult<MapModel> {
  const area = resolveArea(model.size, corners.from, corners.to);
  if (!area.ok) return area;
  const after = editArea(model, area.value, (chunk) => setHeightsInChunk(chunk, area.value, rule));
  if (after === model) return ok(model);
  return ok(carryRestingObjects({ before: model, after, area: area.value }));
}

/** Põe a altura nas casas que têm chão; casas sem chão ficam como estão. */
export function setTerrainHeight(
  model: MapModel,
  change: TerrainHeightChange,
): MapResult<MapModel> {
  const { height } = change;
  if (!Number.isInteger(height) || height < 0 || height > MAX_TERRAIN_HEIGHT) {
    return fail([
      `A altura do terreno precisa ser um número inteiro de 0 a ${MAX_TERRAIN_HEIGHT}.`,
    ]);
  }
  return changeHeights(model, change, () => height);
}

/**
 * Pincel de altura: sobe ou desce as casas com chão `delta` degraus, parando em 0 e no máximo
 * (uma casa já no topo fica onde está, as outras sobem). Casas sem chão ficam como estão.
 */
export function stepTerrainHeight(model: MapModel, step: TerrainHeightStep): MapResult<MapModel> {
  const { delta } = step;
  if (!Number.isInteger(delta) || Math.abs(delta) > MAX_TERRAIN_HEIGHT) {
    return fail([
      `O pincel de altura sobe ou desce um número inteiro de até ${MAX_TERRAIN_HEIGHT} degraus.`,
    ]);
  }
  if (delta === 0) return ok(model);
  return changeHeights(model, step, (current) => clampHeight(current + delta));
}
