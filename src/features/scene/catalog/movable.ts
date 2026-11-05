/**
 * Que peça do mapa o mestre pode pegar e levar para outra casa durante o jogo (RPG-27). Quem
 * decide é o grupo da biblioteca: veículos (carro, carroça, caminhão) e objetos soltos (barril,
 * caixote, mesa, baú) se movem; chão, parede, telhado, escada, estrutura e natureza ficam onde
 * o mapa foi montado, porque arrastá-los por engano no meio da sessão desmontaria o cenário.
 */
import type { PieceAsset } from '@/domain/map-v2';
import { pieceCatalog } from './catalog';
import type { PieceCategory } from './catalog-types';

export const MOVABLE_CATEGORIES: ReadonlySet<PieceCategory> = new Set<PieceCategory>([
  'vehicle',
  'furniture',
]);

/**
 * A peça se move durante o jogo? O modelo enviado pelo mestre não tem grupo na biblioteca; ele
 * se move, porque quase sempre é um objeto ou miniatura que o próprio mestre trouxe para a mesa.
 * Chave que o catálogo não conhece não se move.
 */
export function isMovableAsset(asset: PieceAsset): boolean {
  if (asset.source !== 'catalog') return true;
  const entry = pieceCatalog.get(asset.key);
  return entry !== undefined && entry.kind === 'prop' && MOVABLE_CATEGORIES.has(entry.category);
}
