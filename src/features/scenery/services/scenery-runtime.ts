/**
 * O cenário que o mestre move durante o jogo (RPG-27): do lado do mestre, achar no mapa editado
 * as peças que mudaram de lugar e avisar a mesa; do lado de quem recebe, conferir o aviso com o
 * próprio mapa e fazer a peça deslizar. Quem grava no banco é o salvamento automático do editor
 * (só os pedaços tocados); o aviso só adianta o que o banco vai confirmar.
 */
import { glideProgress, interpolatePose, type Cell, type GlidePose } from '@/domain';
import {
  findPiece,
  findPieceById,
  movedPieces,
  movePiece,
  occupiedCells,
  pieceFitsInMap,
  removePiece,
  sameSpot,
  spotOf,
  type MapModel,
  type MapPiece,
  type PieceMove,
  type PieceMovedMessage,
} from '@/domain/map-v2';
import { isMovableAsset } from '@/features/scene';
import { pieceTransform } from '@/features/scene/chunks/chunk-instances';
import { useTokensStore } from '@/features/tokens';
import { GLIDE_DURATION_MS, MAX_GLIDES_PER_CHANGE, PENDING_MOVE_TTL_MS } from '../constants';
import { useSceneryStore } from '../hooks/scenery-store';
import type { SceneryGlide } from '../types';

/** A casa está toda sob a névoa? (a mesma função que a névoa registra para os tokens) */
export type FogCovers = (anchor: Cell, size: number) => boolean;

export function poseOf(piece: MapPiece): GlidePose {
  const { x, y, z, rotationY } = pieceTransform(piece);
  return { x, y, z, rotationY };
}

/** Onde a peça está no deslize agora. */
export function poseAt(glide: SceneryGlide, now: number): GlidePose {
  return interpolatePose(
    glide.from,
    glide.to,
    glideProgress(now - glide.startedAt, GLIDE_DURATION_MS),
  );
}

/**
 * Carros e objetos soltos que mudaram de lugar entre os dois mapas. Mudança em massa (mais que
 * MAX_GLIDES_PER_CHANGE) não desliza: a mesa só relê o mapa.
 */
export function sceneryMoves(before: MapModel, after: MapModel): PieceMove[] {
  const moves = movedPieces(before, after).filter((move) => isMovableAsset(move.after.asset));
  return moves.length > MAX_GLIDES_PER_CHANGE ? [] : moves;
}

/**
 * O jogador vê a peça? A mesma regra do banco (redact_fogged_chunk): basta uma casa dela fora
 * da névoa. Sem névoa, tudo está à vista.
 */
export function visibleToPlayers(piece: MapPiece, covers: FogCovers | null): boolean {
  if (!covers) return true;
  return occupiedCells(piece).some((cell) => !covers(cell, 1));
}

let nextSerial = 0;

type GlideInput = {
  mapId: string;
  before: MapPiece;
  after: MapPiece;
  now: number;
  /** O deslize anterior da mesma peça: o novo sai de onde ela está agora, sem pular. */
  previous?: SceneryGlide;
};

export function createGlide({ mapId, before, after, now, previous }: GlideInput): SceneryGlide {
  nextSerial += 1;
  const from = previous?.gliding ? poseAt(previous, now) : poseOf(before);
  return {
    serial: nextSerial,
    mapId,
    piece: after,
    origin: previous?.origin ?? spotOf(before),
    from,
    to: poseOf(after),
    startedAt: now,
    gliding: true,
  };
}

/**
 * Põe o deslize na tela e marca quando ele termina e quando a tela volta a seguir só o banco.
 * `keepMs` = quanto tempo a peça fica no lugar novo mesmo sem o banco confirmar.
 */
export function startGlide(glide: SceneryGlide, keepMs: number): void {
  const store = useSceneryStore.getState();
  store.start(glide);
  const pieceId = glide.piece.id;
  setTimeout(() => useSceneryStore.getState().settle(pieceId, glide.serial), GLIDE_DURATION_MS);
  setTimeout(
    () => useSceneryStore.getState().drop(pieceId, glide.serial),
    Math.max(keepMs, GLIDE_DURATION_MS),
  );
}

/**
 * O mapa que a cena desenha com o cenário em movimento por cima: a peça que ainda desliza sai
 * do pedaço (a cena a desenha à parte) e a que já chegou fica no lugar novo, mesmo que o mapa
 * lido do banco ainda não tenha a gravação do mestre. O MESMO modelo quando nada muda.
 */
export function applyGlides(
  model: MapModel,
  mapId: string,
  glides: Readonly<Record<string, SceneryGlide>>,
): MapModel {
  let next = model;
  for (const glide of Object.values(glides)) {
    if (glide.mapId !== mapId) continue;
    const { id } = glide.piece;
    const found =
      findPiece(next, glide.piece) ??
      findPiece(next, { id, x: glide.origin.x, z: glide.origin.z }) ??
      findPieceById(next, id);
    if (!found) continue;
    if (glide.gliding) {
      const removed = removePiece(next, found);
      if (removed.ok) next = removed.value;
      continue;
    }
    if (sameSpot(found, glide.piece)) continue;
    const moved = movePiece(next, found, glide.piece);
    if (moved.ok) next = moved.value;
  }
  return next;
}

type GameMasterChange = {
  mapId: string;
  before: MapModel;
  after: MapModel;
  /** O mapa é o que a mesa está vendo? Mapa que os jogadores não veem não vai ao canal. */
  shared: boolean;
  covers: FogCovers | null;
  announce: (message: PieceMovedMessage) => void;
  now: number;
};

/**
 * O mestre mexeu no mapa: cada carro ou objeto solto que mudou de lugar desliza na tela dele, e
 * a mesa recebe o aviso se a peça está à vista dos jogadores antes e depois. A que entra ou sai
 * da névoa não vai ao canal: o jogador a vê aparecer ou sumir quando relê o mapa, e o aviso não
 * conta onde ela estava escondida.
 */
export function handleGameMasterChange(change: GameMasterChange): void {
  const { mapId, covers, now } = change;
  for (const { before, after } of sceneryMoves(change.before, change.after)) {
    const previous = useSceneryStore.getState().glides[after.id];
    // Na tela do mestre o editor já tem o mapa novo: o deslize só dura o próprio deslize.
    startGlide(createGlide({ mapId, before, after, now, previous }), GLIDE_DURATION_MS);
    if (!change.shared) continue;
    if (!visibleToPlayers(before, covers) || !visibleToPlayers(after, covers)) continue;
    change.announce({ mapId, pieceId: after.id, from: spotOf(before), to: spotOf(after) });
  }
}

type Received = { message: PieceMovedMessage; mapId: string; model: MapModel; now: number };

/**
 * Confere o aviso com o mapa na tela e devolve o deslize, ou null quando ele não vale: outro
 * mapa, peça que o jogador não tem (sob a névoa), que não está onde o aviso diz, que não se
 * move (casa, parede) ou que não caberia no lugar novo. Qualquer membro pode mandar lixo no
 * canal; assim, no máximo, um carro desliza por engano até o banco desmentir.
 */
export function glideForMessage({ message, mapId, model, now }: Received): SceneryGlide | null {
  if (message.mapId !== mapId) return null;
  const previous = useSceneryStore.getState().glides[message.pieceId];
  const known = previous?.mapId === mapId ? previous : undefined;
  const current =
    known?.piece ?? findPiece(model, { id: message.pieceId, x: message.from.x, z: message.from.z });
  if (!current || !sameSpot(current, message.from) || !isMovableAsset(current.asset)) return null;
  const after = { ...current, ...spotOf(message.to) };
  if (!pieceFitsInMap(model.size, after)) return null;
  return createGlide({ mapId, before: current, after, now, previous: known });
}

/** Aviso que chegou pelo canal da mesa: a peça desliza na tela de quem não é o mestre. */
export function receivePieceMoved(message: PieceMovedMessage): void {
  const view = useTokensStore.getState().view;
  if (!view) return;
  const glide = glideForMessage({
    message,
    mapId: view.mapId,
    model: view.model,
    now: performance.now(),
  });
  if (glide) startGlide(glide, PENDING_MOVE_TTL_MS);
}
