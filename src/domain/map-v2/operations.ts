/**
 * Operações de edição do mapa v2: funções puras que devolvem um modelo novo. Só os pedaços
 * tocados viram objetos novos; todos os outros mantêm a MESMA referência, e quando nada muda
 * a função devolve o próprio modelo. É isso que deixa barato gravar só o que mudou (autosave)
 * e redesenhar só o que mudou (cena): comparar referências diz quais pedaços mudaram.
 *
 * Toda operação devolve MapResult, para a tela poder dizer em PT-BR por que uma jogada foi
 * recusada. Apagar o que não existe não é erro: some o que havia, e o modelo fica como está.
 */
import { isEdgeInside, isInside, type Cell } from '../grid';
import type { MapResult } from '../map-document';
import { chunkKey } from './chunks';
import {
  editArea,
  forEachIndex,
  replaceChunk,
  resolveArea,
  resolveTile,
  withChunks,
} from './chunk-edit';
import { MAX_PIECES_PER_CHUNK, MAX_WALLS_PER_CHUNK } from './constants';
import { pieceFitsInMap, pieceOwnerChunk } from './footprint';
import { wallTopLevel } from './height';
import { getChunk } from './model';
import { intersectRects, type CellRect } from './rect';
import { catalogKeySchema, pieceSchema, wallSchema, type MapPiece, type MapWall } from './schema';
import type { MapChunk, MapModel } from './types';
import { fail, ok, parseWithSchema } from './validation';
import { sameWallKey, wallOwnerChunk, type WallKey } from './walls';

// ---------------------------------------------------------------------------
// Terreno
// ---------------------------------------------------------------------------

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
 * Põe várias peças de uma vez (uma casa pronta inteira): as mesmas regras de placePiece, mas a
 * busca de ids repetidos olha o mapa uma vez só, e não uma vez por peça. Se uma peça é recusada,
 * nenhuma entra: a casa pronta não fica pela metade.
 */
export function placePieces(model: MapModel, pieces: readonly MapPiece[]): MapResult<MapModel> {
  const taken = new Set<string>();
  for (const chunk of model.chunks.values()) for (const piece of chunk.pieces) taken.add(piece.id);
  const added = new Map<string, MapPiece[]>();
  for (const piece of pieces) {
    const parsed = parseWithSchema(pieceSchema, piece);
    if (!parsed.ok) return parsed;
    const clean = parsed.value;
    if (!pieceFitsInMap(model.size, clean)) return fail([`A peça "${clean.id}" não cabe no mapa.`]);
    if (taken.has(clean.id)) return fail([`Já existe uma peça com o id "${clean.id}" neste mapa.`]);
    taken.add(clean.id);
    const key = chunkKey(pieceOwnerChunk(clean));
    const list = added.get(key);
    if (list) list.push(clean);
    else added.set(key, [clean]);
  }
  const replaced = new Map<string, MapChunk>();
  for (const [key, list] of added) {
    const owner = getChunk(model, pieceOwnerChunk(list[0]!));
    if (owner.pieces.length + list.length > MAX_PIECES_PER_CHUNK) {
      return fail([`Este pedaço do mapa já tem o máximo de ${MAX_PIECES_PER_CHUNK} peças.`]);
    }
    replaced.set(key, { ...owner, pieces: [...owner.pieces, ...list] });
  }
  return ok(withChunks(model, replaced));
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

/** As duas paredes estão na mesma aresta e dividem algum trecho de altura? */
function overlapsOnEdge(a: MapWall, b: MapWall): boolean {
  if (a.x !== b.x || a.z !== b.z || a.side !== b.side) return false;
  return a.level < wallTopLevel(b) && b.level < wallTopLevel(a);
}

function sameWall(a: MapWall, b: MapWall): boolean {
  return sameWallKey(a, b) && a.style === b.style && a.height === b.height;
}

/**
 * Põe a parede no pedaço dono da aresta. As paredes da mesma aresta que dividem algum trecho
 * de altura com ela saem: duas paredes no mesmo lugar só brigariam na tela, e o mestre que
 * desenha por cima quer trocar a de baixo. Em alturas que não se tocam, é um andar empilhado.
 */
export function placeWall(model: MapModel, wall: MapWall): MapResult<MapModel> {
  const parsed = parseWithSchema(wallSchema, wall);
  if (!parsed.ok) return parsed;
  const clean = parsed.value;
  if (!isEdgeInside(model.size, clean)) {
    return fail([`A parede em (${clean.x}, ${clean.z}) está fora do mapa.`]);
  }
  const owner = getChunk(model, wallOwnerChunk(model.size, clean));
  const overlapping = owner.walls.filter((existing) => overlapsOnEdge(existing, clean));
  if (overlapping.length === 1 && sameWall(overlapping[0]!, clean)) return ok(model);
  if (overlapping.length === 0 && owner.walls.length >= MAX_WALLS_PER_CHUNK) {
    return fail([`Este pedaço do mapa já tem o máximo de ${MAX_WALLS_PER_CHUNK} paredes.`]);
  }
  // A nova fica no lugar da primeira que ela tira: a ordem das outras não muda.
  const first = owner.walls.findIndex((existing) => overlapsOnEdge(existing, clean));
  const walls = owner.walls.filter((existing) => !overlapsOnEdge(existing, clean));
  walls.splice(first < 0 ? walls.length : first, 0, clean);
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
