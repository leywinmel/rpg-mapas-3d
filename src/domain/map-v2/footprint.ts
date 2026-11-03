/**
 * Peças que ocupam várias casas (RPG-26: carros 2×4, carroças, fontes, árvores grandes).
 * A âncora (x, z) é a casa de MENOR x e menor z do retângulo ocupado, em qualquer giro; a
 * cena centraliza o modelo nesse retângulo. A peça pertence ao pedaço da âncora, mesmo
 * quando avança para o vizinho, por isso achar as peças de uma casa olha também os vizinhos.
 */
import type { Cell, GridSize } from '../grid';
import { chunkOfCell, chunksTouchedByRect, type ChunkCoord } from './chunks';
import { MAX_FOOTPRINT } from './constants';
import { isRectInside, rectCells, type CellRect } from './rect';
import type { MapPiece } from './schema';

export type Footprint = { readonly width: number; readonly depth: number };

/** O que decide o retângulo de uma peça: âncora, giro e tamanho antes de girar. */
export type PiecePlacement = Pick<MapPiece, 'x' | 'z' | 'rotation' | 'footprint'>;

/** Tamanho em casas depois de girar: um ou três quartos de volta trocam largura e profundidade. */
export function rotatedFootprint(footprint: Footprint, rotation: number): Footprint {
  const swapped = rotation % 2 !== 0;
  return swapped
    ? { width: footprint.depth, depth: footprint.width }
    : { width: footprint.width, depth: footprint.depth };
}

/** Retângulo de casas que a peça ocupa, já girado. */
export function pieceRect(piece: PiecePlacement): CellRect {
  const { width, depth } = rotatedFootprint(piece.footprint, piece.rotation);
  return { x: piece.x, z: piece.z, width, depth };
}

/** As casas ocupadas, linha a linha (z, depois x). */
export function occupiedCells(piece: PiecePlacement): Cell[] {
  return rectCells(pieceRect(piece));
}

/** A peça cabe inteira no mapa? Girar pode fazer uma peça que cabia passar da borda. */
export function pieceFitsInMap(size: GridSize, piece: PiecePlacement): boolean {
  return isRectInside(size, pieceRect(piece));
}

/** Pedaço que guarda a peça no documento: o da âncora. É o único que o autosave regrava. */
export function pieceOwnerChunk(piece: Pick<MapPiece, 'x' | 'z'>): ChunkCoord {
  return chunkOfCell(piece);
}

/**
 * Todos os pedaços onde a peça aparece, para redesenhar: o da âncora vem primeiro e os
 * outros são os vizinhos a leste e ao sul em que ela avança. O que passa da borda do mapa é ignorado.
 */
export function chunksTouchedByPiece(size: GridSize, piece: PiecePlacement): ChunkCoord[] {
  return chunksTouchedByRect(size, pieceRect(piece));
}

/**
 * Casas onde a âncora de uma peça pode estar para ela alcançar `cell`: até MAX_FOOTPRINT - 1
 * casas a oeste ou ao norte. Como isso é bem menos que um pedaço, a janela toca no máximo
 * quatro pedaços.
 */
export function anchorWindow(cell: Cell): CellRect {
  const x = Math.max(cell.x - (MAX_FOOTPRINT - 1), 0);
  const z = Math.max(cell.z - (MAX_FOOTPRINT - 1), 0);
  return { x, z, width: cell.x - x + 1, depth: cell.z - z + 1 };
}
