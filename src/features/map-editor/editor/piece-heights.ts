/**
 * Altura de cada objeto, em degraus (meia unidade), para empilhar: onde a peça de cima pousa.
 *
 * Vale a altura que o catálogo já conhece (as peças de pacote trazem a do próprio modelo),
 * arredondada para o degrau mais perto. As peças desenhadas no código não têm altura no
 * catálogo: para elas a tabela casa pelo TIPO do objeto (o ícone: barril, mesa, baú...), com
 * valores medidos no desenho. Modelo enviado pelo mestre não tem nenhum dos dois: vale a
 * altura padrão, e o mestre ajusta o nível à mão.
 */
import { worldToSteps, type MapPiece, type PieceAsset } from '@/domain/map-v2';
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
  const entry = pieceCatalog.get(asset.key);
  if (entry?.height !== undefined) return worldToSteps(entry.height);
  return (entry && HEIGHT_BY_TYPE[entry.icon]) ?? DEFAULT_PIECE_HEIGHT_STEPS;
}

/** A forma que o domínio pede para empilhar. */
export function heightOfPiece(piece: MapPiece): number {
  return pieceHeightSteps(piece.asset);
}
