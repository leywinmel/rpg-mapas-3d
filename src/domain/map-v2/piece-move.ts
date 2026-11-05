/**
 * Mover uma peça que já está no mapa (RPG-27): o mestre leva o carro ou o caixote para outra
 * casa durante o jogo, e a mesa vê a peça deslizar até lá. Mover é tirar e pôr de novo com as
 * mesmas regras de placePiece (cabe no mapa, limite do pedaço); por isso a peça movida vai
 * para o fim da lista do pedaço dono, no mestre e em quem aplica o mesmo aviso. A ordem igual
 * deixa o pedaço gravado igual ao da tela, e a cena não redesenha à toa quando o banco chega.
 */
import { z } from 'zod';
import type { MapResult } from '../map-document';
import { changedChunks } from './model';
import { chunkKey } from './chunks';
import { pieceOwnerChunk } from './footprint';
import { placePiece, removePiece, type PieceRef } from './operations';
import { pieceSchema, type MapPiece } from './schema';
import type { MapChunk, MapModel } from './types';
import { fail, ok } from './validation';

/** Onde a peça está: âncora, giro e degrau da base. O resto (modelo, tamanho) não muda ao mover. */
export type PieceSpot = Pick<MapPiece, 'x' | 'z' | 'rotation' | 'level'>;

export function spotOf(piece: PieceSpot): PieceSpot {
  return { x: piece.x, z: piece.z, rotation: piece.rotation, level: piece.level };
}

export function sameSpot(a: PieceSpot, b: PieceSpot): boolean {
  return a.x === b.x && a.z === b.z && a.rotation === b.rotation && a.level === b.level;
}

/** A peça pelo id e pela âncora, ou undefined se ela não está mais lá (ex: depois de desfazer). */
export function findPiece(model: MapModel, ref: PieceRef): MapPiece | undefined {
  const owner = model.chunks.get(chunkKey(pieceOwnerChunk(ref)));
  return owner?.pieces.find((piece) => piece.id === ref.id);
}

/**
 * A peça pelo id, em qualquer pedaço. Custa o número de peças do mapa: use só quando não se
 * sabe a âncora (ex: a peça já pode ter sido movida pelo banco).
 */
export function findPieceById(model: MapModel, id: string): MapPiece | undefined {
  for (const chunk of model.chunks.values()) {
    const found = chunk.pieces.find((piece) => piece.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Leva a peça para outro lugar. O MESMO modelo quando ela já está lá (o histórico não ganha
 * passo vazio); recusa quando a peça não existe mais ou não cabe no lugar novo.
 */
export function movePiece(model: MapModel, ref: PieceRef, spot: PieceSpot): MapResult<MapModel> {
  const piece = findPiece(model, ref);
  if (!piece) return fail(['Essa peça não está mais no mapa.']);
  if (sameSpot(piece, spot)) return ok(model);
  const removed = removePiece(model, piece);
  if (!removed.ok) return removed;
  return placePiece(removed.value, { ...piece, ...spotOf(spot) });
}

export type PieceMove = { readonly before: MapPiece; readonly after: MapPiece };

function piecesById(chunks: readonly MapChunk[]): Map<string, MapPiece> {
  const byId = new Map<string, MapPiece>();
  for (const chunk of chunks) for (const piece of chunk.pieces) byId.set(piece.id, piece);
  return byId;
}

/**
 * Peças que mudaram de lugar de um modelo para o outro: as que existem nos dois com âncora,
 * giro ou degrau diferentes. Só olha os pedaços cujas peças mudaram (a pincelada de chão
 * mantém a lista de peças), então custa as peças desses pedaços e não as do mapa. Mapa de
 * outro tamanho não é movimento: é outro mapa.
 */
export function movedPieces(before: MapModel, after: MapModel): PieceMove[] {
  if (before === after) return [];
  if (before.size.width !== after.size.width || before.size.depth !== after.size.depth) return [];
  const old: MapChunk[] = [];
  const now: MapChunk[] = [];
  for (const coord of changedChunks(before, after)) {
    const key = chunkKey(coord);
    const previous = before.chunks.get(key);
    const next = after.chunks.get(key);
    if (!previous || !next || previous.pieces === next.pieces) continue;
    old.push(previous);
    now.push(next);
  }
  if (old.length === 0) return [];
  const oldById = piecesById(old);
  const moves: PieceMove[] = [];
  for (const [id, piece] of piecesById(now)) {
    const was = oldById.get(id);
    if (was && !sameSpot(was, piece)) moves.push({ before: was, after: piece });
  }
  return moves;
}

const spotSchema = pieceSchema.pick({ x: true, z: true, rotation: true, level: true });

/**
 * Aviso "a peça mudou de lugar", que vai pelo canal da mesa. Só ids e lugares: o modelo e o
 * resto da peça quem tem é o mapa de cada um. Qualquer membro pode mandar lixo no canal, então
 * quem recebe confere com este schema e com o próprio mapa antes de mexer em algo.
 */
export const pieceMovedMessageSchema = z.object({
  mapId: z.uuid(),
  pieceId: pieceSchema.shape.id,
  from: spotSchema,
  to: spotSchema,
});
export type PieceMovedMessage = z.infer<typeof pieceMovedMessageSchema>;
