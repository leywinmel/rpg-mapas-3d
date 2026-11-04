/**
 * Altura de cada objeto, em degraus (meia unidade), para empilhar: onde a peça de cima pousa.
 *
 * O catálogo da cena não guarda altura, e os modelos podem mudar de pacote; por isso a tabela
 * casa pelo TIPO do objeto (o ícone do catálogo: barril, mesa, baú...), não pelo arquivo do
 * modelo. Os valores vêm das peças desenhadas hoje, arredondados para o degrau mais perto.
 * Modelo enviado pelo mestre não tem tipo: vale a altura padrão, e o mestre ajusta o nível à mão.
 */
import type { MapPiece, PieceAsset } from '@/domain/map-v2';
import { pieceCatalog, type PieceIcon } from '@/features/scene';

/** Objeto sem tipo conhecido (ex: .glb do mestre): uma unidade, a altura de uma mesa. */
export const DEFAULT_PIECE_HEIGHT_STEPS = 2;

const HEIGHT_BY_TYPE: Partial<Readonly<Record<PieceIcon, number>>> = {
  cylinder: 1,
  box: 1,
  table: 2,
  armchair: 1,
  chest: 1,
  pillar: 4,
  statue: 3,
  rock: 1,
  tree: 3,
  flame: 2,
};

export function pieceHeightSteps(asset: PieceAsset): number {
  if (asset.source !== 'catalog') return DEFAULT_PIECE_HEIGHT_STEPS;
  const icon = pieceCatalog.get(asset.key)?.icon;
  return (icon && HEIGHT_BY_TYPE[icon]) ?? DEFAULT_PIECE_HEIGHT_STEPS;
}

/** A forma que o domínio pede para empilhar. */
export function heightOfPiece(piece: MapPiece): number {
  return pieceHeightSteps(piece.asset);
}
