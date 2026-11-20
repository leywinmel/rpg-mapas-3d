/**
 * Peças com interação (RPG-44): a ambulância e a van abrem as portas de trás, o trator com pá
 * levanta a pá. Só o mestre aciona (só ele edita o mapa); a mesa vê porque o estado mora na
 * peça, gravado no mapa como qualquer outra mudança. A peça fechada não grava nada: os mapas
 * de antes continuam iguais.
 */
import type { MapResult } from '../map-document';
import type { PieceRef } from './operations';
import { updatePiece } from './paint';
import type { MapPiece, PieceAsset } from './schema';
import type { MapModel } from './types';

export type PieceAction = {
  /** O que o botão diz com a peça fechada. */
  readonly open: string;
  /** E com ela aberta. */
  readonly close: string;
};

const REAR_DOORS: PieceAction = {
  open: 'Abrir as portas de trás',
  close: 'Fechar as portas de trás',
};

/** As peças do catálogo que têm o que acionar, pela chave. */
export const PIECE_ACTIONS: Readonly<Record<string, PieceAction>> = {
  'mod-ambulancia': REAR_DOORS,
  'mod-van': REAR_DOORS,
  'mod-trator-pa': { open: 'Levantar a pá', close: 'Baixar a pá' },
};

export function assetAction(asset: PieceAsset): PieceAction | undefined {
  return asset.source === 'catalog' ? PIECE_ACTIONS[asset.key] : undefined;
}

export const isInteractive = (piece: Pick<MapPiece, 'asset'>): boolean =>
  assetAction(piece.asset) !== undefined;

/** A mesma peça aberta ou fechada; fechada fica sem o campo. */
export function withOpen(piece: MapPiece, open: boolean): MapPiece {
  if (open) return { ...piece, open: true };
  const copy = { ...piece };
  delete copy.open;
  return copy;
}

/** Abre a peça fechada e fecha a aberta; peça sem interação volta o mesmo modelo. */
export function toggleOpen(model: MapModel, ref: PieceRef): MapResult<MapModel> {
  return updatePiece(model, ref, (piece) =>
    isInteractive(piece) ? withOpen(piece, !piece.open) : piece,
  );
}
