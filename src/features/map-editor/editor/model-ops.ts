/**
 * O que cada ferramenta do editor faz no mapa v2. As regras moram no domínio (operações
 * imutáveis de '@/domain/map-v2'); aqui só se traduz "o cursor está nesta casa, perto desta
 * aresta" para a operação certa, com a peça ou parede já apoiada no chão.
 */
import type { Ambience, Cell, GridEdge, MapResult } from '@/domain';
import {
  chunkKey,
  getChunk,
  paintTerrainCell,
  pieceOwnerChunk,
  piecesOccupyingCell,
  placePiece,
  placeWall,
  MAX_LEVEL,
  QUARTER_TURNS,
  removePiece,
  removeWall,
  stackedPieceLevel,
  terrainAt,
  wallOwnerChunk,
  wallRestingLevel,
  type Footprint,
  type MapModel,
  type MapPiece,
  type MapWall,
  type PieceAsset,
  type PieceRef,
} from '@/domain/map-v2';
import { distanceToNearestEdge, nearestEdge } from '@/features/scene';
import { heightOfPiece } from './piece-heights';

/** Até esta distância da aresta, a borracha prefere apagar a parede em vez do chão. */
export const WALL_ERASE_RANGE = 0.22;
const DEFAULT_PIECE_SCALE = 1;

export type PointerHit = { cell: Cell; point: { x: number; z: number } };

export function normalizeQuarterTurns(turns: number): number {
  return ((turns % QUARTER_TURNS) + QUARTER_TURNS) % QUARTER_TURNS;
}

/** Paredes da aresta, de baixo para cima (todas moram no mesmo pedaço). */
export function wallsOnEdge(model: MapModel, edge: GridEdge): MapWall[] {
  return getChunk(model, wallOwnerChunk(model.size, edge))
    .walls.filter((wall) => wall.x === edge.x && wall.z === edge.z && wall.side === edge.side)
    .sort((a, b) => a.level - b.level);
}

/** A peça pelo id e pela âncora, ou undefined se ela não existe mais (ex: depois de desfazer). */
export function findPiece(model: MapModel, ref: PieceRef): MapPiece | undefined {
  const owner = model.chunks.get(chunkKey(pieceOwnerChunk(ref)));
  return owner?.pieces.find((piece) => piece.id === ref.id);
}

/** Peça mais alta da casa: é a que o clique de seleção e a borracha pegam. */
export function topPieceAt(model: MapModel, cell: Cell): MapPiece | undefined {
  return piecesOccupyingCell(model, cell).at(-1);
}

export type WallDraft = { edge: GridEdge; style: string; height: number };

/** A parede nova, apoiada no chão mais alto dos dois lados da aresta. */
export function wallFor(model: MapModel, draft: WallDraft): MapWall {
  const { edge, style, height } = draft;
  return { ...edge, style, height, level: wallRestingLevel(model, edge) };
}

export type PieceDraft = {
  id: string;
  asset: PieceAsset;
  /** Casa de menor x e z do retângulo que a peça ocupa (a casa sob o cursor). */
  anchor: Cell;
  rotation: number;
  footprint: Footprint;
};

/** A peça nova, pousada no topo do que já está embaixo dela (chão, peça ou parede). */
export function pieceFor(model: MapModel, draft: PieceDraft): MapPiece {
  const placement = {
    x: draft.anchor.x,
    z: draft.anchor.z,
    rotation: normalizeQuarterTurns(draft.rotation),
    footprint: { width: draft.footprint.width, depth: draft.footprint.depth },
  };
  return {
    id: draft.id,
    asset: draft.asset,
    ...placement,
    level: stackedPieceLevel(model, { placement, heightOf: heightOfPiece }),
    scale: DEFAULT_PIECE_SCALE,
  };
}

export function placeWallAt(model: MapModel, draft: WallDraft): MapResult<MapModel> {
  return placeWall(model, wallFor(model, draft));
}

export function placePieceAt(model: MapModel, draft: PieceDraft): MapResult<MapModel> {
  return placePiece(model, pieceFor(model, draft));
}

/**
 * Gira a peça um quarto de volta sobre a mesma âncora. A peça de várias casas troca largura
 * e profundidade e volta a se apoiar no chão das casas novas; se não couber, fica como estava.
 */
export function rotatePiece(model: MapModel, ref: PieceRef): MapResult<MapModel> {
  const piece = findPiece(model, ref);
  if (!piece) return { ok: true, value: model };
  const removed = removePiece(model, piece);
  if (!removed.ok) return removed;
  const turned = { ...piece, rotation: normalizeQuarterTurns(piece.rotation + 1) };
  const wasResting = piece.level === restingLevelOf(removed.value, piece);
  const level = wasResting ? restingLevelOf(removed.value, turned) : piece.level;
  return placePiece(removed.value, { ...turned, level });
}

/** Onde a peça pousaria ali, sem contar ela mesma. */
function restingLevelOf(model: MapModel, piece: MapPiece): number {
  return stackedPieceLevel(model, {
    placement: piece,
    heightOf: heightOfPiece,
    ignoreId: piece.id,
  });
}

/**
 * Sobe ou desce a peça `delta` degraus, à mão: para o que o empilhamento automático não acerta
 * (modelo do mestre de altura desconhecida, peça pendurada na parede). Fica entre 0 e o
 * máximo; o MESMO modelo quando nada muda, para o histórico não ganhar passo vazio.
 */
export function shiftPieceLevel(
  model: MapModel,
  ref: PieceRef,
  delta: number,
): MapResult<MapModel> {
  const piece = findPiece(model, ref);
  if (!piece) return { ok: true, value: model };
  const level = Math.min(Math.max(piece.level + delta, 0), MAX_LEVEL);
  if (level === piece.level) return { ok: true, value: model };
  const removed = removePiece(model, piece);
  if (!removed.ok) return removed;
  return placePiece(removed.value, { ...piece, level });
}

export type EraseTarget =
  | { layer: 'wall'; wall: MapWall }
  | { layer: 'piece'; piece: PieceRef }
  | { layer: 'floor'; cell: Cell };

/**
 * O que a borracha apaga sob o cursor, do que está "por cima" para baixo: a parede mais alta
 * da aresta (se o cursor está colado nela), depois a peça mais alta da casa, depois o chão.
 */
export function eraseTargetAt(model: MapModel, hit: PointerHit): EraseTarget | null {
  const edge = nearestEdge(hit.cell, hit.point);
  if (distanceToNearestEdge(hit.cell, hit.point) <= WALL_ERASE_RANGE) {
    const wall = wallsOnEdge(model, edge).at(-1);
    if (wall) return { layer: 'wall', wall };
  }
  const piece = topPieceAt(model, hit.cell);
  if (piece) return { layer: 'piece', piece };
  if (terrainAt(model, hit.cell)?.tile) return { layer: 'floor', cell: hit.cell };
  return null;
}

export function eraseTarget(model: MapModel, target: EraseTarget): MapResult<MapModel> {
  switch (target.layer) {
    case 'wall':
      return removeWall(model, target.wall);
    case 'piece':
      return removePiece(model, target.piece);
    case 'floor':
      return paintTerrainCell(model, { cell: target.cell, tile: null });
  }
}

/** Troca o clima; o MESMO modelo quando nada muda, para o histórico não ganhar passo vazio. */
export function setAmbience(model: MapModel, patch: Partial<Ambience>): MapModel {
  const current = model.header.ambience;
  const ambience = { ...current, ...patch };
  const unchanged = (Object.keys(ambience) as Array<keyof Ambience>).every(
    (key) => ambience[key] === current[key],
  );
  return unchanged ? model : { ...model, header: { ...model.header, ambience } };
}
