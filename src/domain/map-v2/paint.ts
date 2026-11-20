/**
 * Pintar paredes e peças e trocar o acabamento das paredes (RPG-33). A ferramenta do editor
 * pinta a casa inteira: a parede clicada e todas as que se ligam a ela pelas pontas (os
 * cantos da casa, as paredes de dentro, os andares de cima). Duas casas encostadas viram
 * uma só, como no papel: o mestre pinta uma parede por vez quando quer separar.
 */
import type { GridEdge } from '../grid';
import type { MapResult } from '../map-document';
import { chunkKey } from './chunks';
import { replaceChunk, withChunks } from './chunk-edit';
import { pieceOwnerChunk } from './footprint';
import { getChunk } from './model';
import type { PieceRef } from './operations';
import { pieceSchema, wallSchema, type MapPiece, type MapWall } from './schema';
import type { MapChunk, MapModel } from './types';
import { ok, parseWithSchema } from './validation';
import { sameWallKey, wallKey, wallOwnerChunk, type WallKey } from './walls';

/**
 * Teto da casa pintada de uma vez. Uma muralha que encosta em todas as casas da cidade
 * ligaria o mapa inteiro; passado o teto, a pintura para ali e o resto fica como estava.
 */
export const MAX_CONNECTED_WALLS = 4000;

/** As duas pontas da aresta, como "x,z" do canto da grade. */
function edgeEnds(edge: GridEdge): [string, string] {
  const start = `${edge.x},${edge.z}`;
  if (edge.side === 'north') return [start, `${edge.x + 1},${edge.z}`];
  return [start, `${edge.x},${edge.z + 1}`];
}

/**
 * A parede de partida e as ligadas a ela por uma ponta, em qualquer andar. Sem parede na
 * partida, a lista sai vazia.
 */
export function connectedWalls(model: MapModel, start: WallKey): MapWall[] {
  const byCorner = new Map<string, MapWall[]>();
  let first: MapWall | undefined;
  for (const chunk of model.chunks.values()) {
    for (const wall of chunk.walls) {
      if (!first && sameWallKey(wall, start)) first = wall;
      for (const corner of edgeEnds(wall)) {
        const list = byCorner.get(corner);
        if (list) list.push(wall);
        else byCorner.set(corner, [wall]);
      }
    }
  }
  if (!first) return [];
  const seen = new Set([wallKey(first)]);
  const found: MapWall[] = [first];
  for (let index = 0; index < found.length && found.length < MAX_CONNECTED_WALLS; index += 1) {
    for (const corner of edgeEnds(found[index]!)) {
      for (const wall of byCorner.get(corner) ?? []) {
        const key = wallKey(wall);
        if (seen.has(key) || found.length >= MAX_CONNECTED_WALLS) continue;
        seen.add(key);
        found.push(wall);
      }
    }
  }
  return found;
}

/** A mesma parede ou peça com a tinta nova; `null` tira a tinta (volta à cor do modelo). */
export function withTint<T extends { tint?: string | undefined }>(item: T, tint: string | null): T {
  if (tint) return { ...item, tint };
  const copy = { ...item };
  delete copy.tint;
  return copy;
}

const sameLook = (a: MapWall, b: MapWall) => a.style === b.style && a.tint === b.tint;

/**
 * Troca as paredes da lista pelo que `update` devolver (tinta, acabamento). Só os pedaços com
 * alguma parede mudada viram objetos novos; nada mudou, o mesmo modelo volta.
 */
export function updateWalls(
  model: MapModel,
  keys: readonly WallKey[],
  update: (wall: MapWall) => MapWall,
): MapResult<MapModel> {
  const byChunk = new Map<string, Set<string>>();
  for (const key of keys) {
    const owner = chunkKey(wallOwnerChunk(model.size, key));
    const set = byChunk.get(owner) ?? new Set<string>();
    byChunk.set(owner, set.add(wallKey(key)));
  }
  const replaced = new Map<string, MapChunk>();
  for (const [owner, wanted] of byChunk) {
    const chunk = model.chunks.get(owner);
    if (!chunk) continue;
    let changed = false;
    const walls: MapWall[] = [];
    for (const wall of chunk.walls) {
      if (!wanted.has(wallKey(wall))) {
        walls.push(wall);
        continue;
      }
      const parsed = parseWithSchema(wallSchema, update(wall));
      if (!parsed.ok) return parsed;
      changed ||= !sameLook(wall, parsed.value);
      walls.push(sameLook(wall, parsed.value) ? wall : parsed.value);
    }
    if (changed) replaced.set(owner, { ...chunk, walls });
  }
  return ok(withChunks(model, replaced));
}

/** Troca a peça pelo que `update` devolver; sem a peça (ou sem mudança), o mesmo modelo. */
export function updatePiece(
  model: MapModel,
  ref: PieceRef,
  update: (piece: MapPiece) => MapPiece,
): MapResult<MapModel> {
  const owner = getChunk(model, pieceOwnerChunk(ref));
  const index = owner.pieces.findIndex((piece) => piece.id === ref.id);
  if (index < 0) return ok(model);
  const current = owner.pieces[index]!;
  const parsed = parseWithSchema(pieceSchema, update(current));
  if (!parsed.ok) return parsed;
  // Só a tinta muda numa peça: o resto que volta do zod é cópia igual.
  if (parsed.value.tint === current.tint) return ok(model);
  const pieces = owner.pieces.slice();
  pieces[index] = parsed.value;
  return ok(replaceChunk(model, { ...owner, pieces }));
}
