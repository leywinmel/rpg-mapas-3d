/**
 * Empilhar peças (RPG-24): a peça nova pousa no topo do que já está embaixo dela.
 *
 * "Embaixo" é, em cada casa que a peça ocupa: o chão, as peças que já ocupam a casa e as
 * paredes que ficam DENTRO do retângulo da peça (uma laje de 3×3 sobre uma parede que corta
 * o meio dela pousa no topo da parede). As paredes da borda do retângulo não contam: senão um
 * barril encostado numa parede subiria para o topo dela.
 *
 * O domínio não sabe a altura de cada modelo (isso é da cena/catálogo); quem chama passa
 * `heightOf`, em degraus.
 */
import type { Cell } from '../grid';
import { chunksTouchedByRect } from './chunks';
import { MAX_LEVEL } from './constants';
import { pieceRect, type PiecePlacement } from './footprint';
import { wallTopLevel } from './height';
import { getChunk, piecesOccupyingCell } from './model';
import { rectCells, type CellRect } from './rect';
import type { MapPiece, MapWall } from './schema';
import { pieceRestingLevel } from './terrain-height';
import type { MapModel } from './types';

/** Altura da peça em degraus (do pé ao topo, onde outra peça pode pousar). */
export type PieceHeightOf = (piece: MapPiece) => number;

export type StackQuery = {
  readonly placement: PiecePlacement;
  readonly heightOf: PieceHeightOf;
  /** A própria peça, quando ela já está no mapa (girar, mover): não pousa em si mesma. */
  readonly ignoreId?: string;
};

/** A aresta da parede fica entre duas casas do retângulo (não na borda dele)? */
function isInsideRect(wall: MapWall, rect: CellRect): boolean {
  const insideX = wall.x >= rect.x && wall.x < rect.x + rect.width;
  const insideZ = wall.z >= rect.z && wall.z < rect.z + rect.depth;
  if (wall.side === 'north') return insideX && wall.z > rect.z && insideZ;
  return insideZ && wall.x > rect.x && insideX;
}

function highestInnerWall(model: MapModel, rect: CellRect): number {
  let highest = 0;
  for (const coord of chunksTouchedByRect(model.size, rect)) {
    for (const wall of getChunk(model, coord).walls) {
      if (isInsideRect(wall, rect)) highest = Math.max(highest, wallTopLevel(wall));
    }
  }
  return highest;
}

function highestPieceTop(model: MapModel, cells: readonly Cell[], query: StackQuery): number {
  let highest = 0;
  for (const cell of cells) {
    for (const piece of piecesOccupyingCell(model, cell)) {
      if (piece.id === query.ignoreId) continue;
      highest = Math.max(highest, piece.level + query.heightOf(piece));
    }
  }
  return highest;
}

/** Degrau da base de uma peça posta ali agora: o topo mais alto embaixo dela. */
export function stackedPieceLevel(model: MapModel, query: StackQuery): number {
  const rect = pieceRect(query.placement);
  const level = Math.max(
    pieceRestingLevel(model, query.placement),
    highestPieceTop(model, rectCells(rect), query),
    highestInnerWall(model, rect),
  );
  return Math.min(level, MAX_LEVEL);
}
