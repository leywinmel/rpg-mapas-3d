/**
 * Operações de edição do mapa v2: funções puras que devolvem um modelo novo. Só os pedaços
 * tocados viram objetos novos; todos os outros mantêm a MESMA referência, e quando nada muda
 * a função devolve o próprio modelo. É isso que deixa barato gravar só o que mudou (autosave)
 * e redesenhar só o que mudou (cena): comparar referências diz quais pedaços mudaram.
 *
 * Toda operação devolve MapResult, para a tela poder dizer em PT-BR por que uma jogada foi
 * recusada. Apagar o que não existe não é erro: some o que havia, e o modelo fica como está.
 */
import { isEdgeInside, isInside, type Cell, type GridSize } from '../grid';
import type { MapResult } from '../map-document';
import { chunkKey, chunksTouchedByRect } from './chunks';
import { MAX_PIECES_PER_CHUNK, MAX_TERRAIN_HEIGHT, MAX_WALLS_PER_CHUNK } from './constants';
import { pieceFitsInMap, pieceOwnerChunk } from './footprint';
import { getChunk } from './model';
import { intersectRects, mapRect, rectFromCorners, type CellRect } from './rect';
import { catalogKeySchema, pieceSchema, wallSchema, type MapPiece, type MapWall } from './schema';
import { NO_FLOOR_INDEX } from './terrain';
import type { MapChunk, MapModel } from './types';
import { fail, ok, parseWithSchema } from './validation';
import { sameWallKey, wallOwnerChunk, type WallKey } from './walls';

// ---------------------------------------------------------------------------
// Troca de pedaços
// ---------------------------------------------------------------------------

function withChunks(model: MapModel, replaced: ReadonlyMap<string, MapChunk>): MapModel {
  if (replaced.size === 0) return model;
  const chunks = new Map(model.chunks);
  for (const [key, chunk] of replaced) chunks.set(key, chunk);
  return { ...model, chunks };
}

function replaceChunk(model: MapModel, chunk: MapChunk): MapModel {
  return withChunks(model, new Map([[chunkKey(chunk.coord), chunk]]));
}

/** Aplica a edição a cada pedaço que a área toca; `edit` devolve o mesmo pedaço se nada mudar. */
function editArea(model: MapModel, area: CellRect, edit: (chunk: MapChunk) => MapChunk): MapModel {
  const replaced = new Map<string, MapChunk>();
  for (const coord of chunksTouchedByRect(model.size, area)) {
    const chunk = getChunk(model, coord);
    const edited = edit(chunk);
    if (edited !== chunk) replaced.set(chunkKey(coord), edited);
  }
  return withChunks(model, replaced);
}

/** Índices (dentro do pedaço) das casas da parte, linha a linha. */
function forEachIndex(bounds: CellRect, part: CellRect, visit: (index: number) => void): void {
  for (let z = part.z; z < part.z + part.depth; z += 1) {
    const rowStart = (z - bounds.z) * bounds.width + (part.x - bounds.x);
    for (let offset = 0; offset < part.width; offset += 1) visit(rowStart + offset);
  }
}

/** A área pedida, cortada na borda do mapa: arrastar o pincel para fora do mapa não é erro. */
function resolveArea(size: GridSize, from: Cell, to: Cell): MapResult<CellRect> {
  if (![from.x, from.z, to.x, to.z].every(Number.isInteger)) {
    return fail(['A área do terreno precisa ter casas inteiras.']);
  }
  const area = intersectRects(mapRect(size), rectFromCorners(from, to));
  return area ? ok(area) : fail(['A área está fora do mapa.']);
}

// ---------------------------------------------------------------------------
// Terreno
// ---------------------------------------------------------------------------

/** Índice da peça na paleta; se ela ainda não está lá, a paleta ganha a peça no fim. */
function resolveTile(
  palette: readonly string[],
  tile: string | null,
): { palette: readonly string[]; index: number } {
  if (tile === null) return { palette, index: NO_FLOOR_INDEX };
  const known = palette.indexOf(tile);
  if (known >= 0) return { palette, index: known + 1 };
  return { palette: [...palette, tile], index: palette.length + 1 };
}

function paintChunk(chunk: MapChunk, area: CellRect, tile: string | null): MapChunk {
  const part = intersectRects(chunk.bounds, area);
  if (!part) return chunk;
  const { terrain } = chunk;
  const { palette, index: paletteIndex } = resolveTile(terrain.palette, tile);
  const tiles = terrain.tiles.slice();
  // Tirar o chão apaga a altura (como no v1); pintar só troca a peça e mantém a altura.
  const heights = tile === null ? terrain.heights.slice() : terrain.heights;
  let changed = false;
  forEachIndex(chunk.bounds, part, (index) => {
    if (tiles[index] === paletteIndex) return;
    tiles[index] = paletteIndex;
    if (tile === null) heights[index] = 0;
    changed = true;
  });
  return changed ? { ...chunk, terrain: { palette, tiles, heights } } : chunk;
}

function setHeightInChunk(chunk: MapChunk, area: CellRect, height: number): MapChunk {
  const part = intersectRects(chunk.bounds, area);
  if (!part) return chunk;
  const heights = chunk.terrain.heights.slice();
  let changed = false;
  forEachIndex(chunk.bounds, part, (index) => {
    // Altura só vale onde há chão: casa sem chão fica no zero.
    if (chunk.terrain.tiles[index] === NO_FLOOR_INDEX || heights[index] === height) return;
    heights[index] = height;
    changed = true;
  });
  return changed ? { ...chunk, terrain: { ...chunk.terrain, heights } } : chunk;
}

export type TerrainPaint = {
  readonly cell: Cell;
  /** Chave da peça de chão, ou null para tirar o chão (deixa um buraco). */
  readonly tile: string | null;
};

export type TerrainRectPaint = {
  /** Dois cantos do retângulo, em qualquer ordem. A parte fora do mapa é ignorada. */
  readonly from: Cell;
  readonly to: Cell;
  readonly tile: string | null;
};

export type TerrainHeightChange = {
  /** Dois cantos do retângulo, em qualquer ordem; para uma casa só, use o mesmo nos dois. */
  readonly from: Cell;
  readonly to: Cell;
  /** Altura em degraus, de 0 a MAX_TERRAIN_HEIGHT. */
  readonly height: number;
};

export function paintTerrainRect(model: MapModel, paint: TerrainRectPaint): MapResult<MapModel> {
  const { from, to, tile } = paint;
  if (tile !== null && !catalogKeySchema.safeParse(tile).success) {
    return fail([`Peça de chão inválida: "${tile}".`]);
  }
  const area = resolveArea(model.size, from, to);
  if (!area.ok) return area;
  return ok(editArea(model, area.value, (chunk) => paintChunk(chunk, area.value, tile)));
}

export function paintTerrainCell(model: MapModel, paint: TerrainPaint): MapResult<MapModel> {
  const { cell, tile } = paint;
  if (!isInside(model.size, cell)) {
    return fail([`A casa (${cell.x}, ${cell.z}) está fora do mapa.`]);
  }
  return paintTerrainRect(model, { from: cell, to: cell, tile });
}

/** Muda a altura do terreno das casas que têm chão; casas sem chão ficam como estão. */
export function setTerrainHeight(
  model: MapModel,
  change: TerrainHeightChange,
): MapResult<MapModel> {
  const { from, to, height } = change;
  if (!Number.isInteger(height) || height < 0 || height > MAX_TERRAIN_HEIGHT) {
    return fail([
      `A altura do terreno precisa ser um número inteiro de 0 a ${MAX_TERRAIN_HEIGHT}.`,
    ]);
  }
  const area = resolveArea(model.size, from, to);
  if (!area.ok) return area;
  return ok(editArea(model, area.value, (chunk) => setHeightInChunk(chunk, area.value, height)));
}

// ---------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------

/** Quem identifica uma peça: o id é único no mapa, e a âncora diz em que pedaço ela está. */
export type PieceRef = Pick<MapPiece, 'id' | 'x' | 'z'>;

/**
 * O id é único no mapa inteiro, e a peça é guardada no pedaço da âncora, então conferir
 * olha todas as peças. Custa o número de peças (não o de casas) e só roda ao pôr uma peça;
 * um índice por id pediria copiar uma tabela do mapa inteiro a cada operação.
 */
function pieceIdExists(model: MapModel, id: string): boolean {
  for (const chunk of model.chunks.values()) {
    if (chunk.pieces.some((piece) => piece.id === id)) return true;
  }
  return false;
}

/**
 * Põe a peça no pedaço da âncora. Sobrepor outras peças é permitido (o mestre decide); a peça
 * só não pode sair do mapa, nem repetir o id de outra.
 */
export function placePiece(model: MapModel, piece: MapPiece): MapResult<MapModel> {
  const parsed = parseWithSchema(pieceSchema, piece);
  if (!parsed.ok) return parsed;
  const clean = parsed.value;
  if (!pieceFitsInMap(model.size, clean)) {
    return fail([`A peça "${clean.id}" não cabe no mapa.`]);
  }
  if (pieceIdExists(model, clean.id)) {
    return fail([`Já existe uma peça com o id "${clean.id}" neste mapa.`]);
  }
  const owner = getChunk(model, pieceOwnerChunk(clean));
  if (owner.pieces.length >= MAX_PIECES_PER_CHUNK) {
    return fail([`Este pedaço do mapa já tem o máximo de ${MAX_PIECES_PER_CHUNK} peças.`]);
  }
  return ok(replaceChunk(model, { ...owner, pieces: [...owner.pieces, clean] }));
}

/**
 * Tira a peça. Sem a âncora certa (ou sem o id) não há o que tirar, e o modelo fica como
 * está: assim tirar duas vezes seguidas, por um duplo clique, não dá erro.
 */
export function removePiece(model: MapModel, ref: PieceRef): MapResult<MapModel> {
  const owner = model.chunks.get(chunkKey(pieceOwnerChunk(ref)));
  if (!owner) return ok(model);
  const pieces = owner.pieces.filter((piece) => piece.id !== ref.id);
  if (pieces.length === owner.pieces.length) return ok(model);
  return ok(replaceChunk(model, { ...owner, pieces }));
}

// ---------------------------------------------------------------------------
// Paredes
// ---------------------------------------------------------------------------

/**
 * Põe a parede no pedaço dono da aresta. Na mesma aresta e no mesmo degrau da base ela
 * substitui a que já estava; em degrau diferente é um andar empilhado.
 */
export function placeWall(model: MapModel, wall: MapWall): MapResult<MapModel> {
  const parsed = parseWithSchema(wallSchema, wall);
  if (!parsed.ok) return parsed;
  const clean = parsed.value;
  if (!isEdgeInside(model.size, clean)) {
    return fail([`A parede em (${clean.x}, ${clean.z}) está fora do mapa.`]);
  }
  const owner = getChunk(model, wallOwnerChunk(model.size, clean));
  const index = owner.walls.findIndex((existing) => sameWallKey(existing, clean));
  if (index < 0) {
    if (owner.walls.length >= MAX_WALLS_PER_CHUNK) {
      return fail([`Este pedaço do mapa já tem o máximo de ${MAX_WALLS_PER_CHUNK} paredes.`]);
    }
    return ok(replaceChunk(model, { ...owner, walls: [...owner.walls, clean] }));
  }
  const current = owner.walls[index]!;
  if (current.style === clean.style && current.height === clean.height) return ok(model);
  const walls = owner.walls.slice();
  walls[index] = clean;
  return ok(replaceChunk(model, { ...owner, walls }));
}

/** Tira a parede da aresta naquele degrau; as de outros degraus da mesma aresta ficam. */
export function removeWall(model: MapModel, key: WallKey): MapResult<MapModel> {
  if (!isEdgeInside(model.size, key)) return ok(model);
  const owner = getChunk(model, wallOwnerChunk(model.size, key));
  const walls = owner.walls.filter((wall) => !sameWallKey(wall, key));
  if (walls.length === owner.walls.length) return ok(model);
  return ok(replaceChunk(model, { ...owner, walls }));
}
