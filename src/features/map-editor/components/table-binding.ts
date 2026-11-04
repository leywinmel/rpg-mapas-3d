import { useEffect, type ReactNode } from 'react';
import type { Cutaway, MapModel } from '@/domain/map-v2';

/** O mapa na tela de quem olha: o do editor do mestre ou o da mesa, para o jogador. */
export type MapView = { mapId: string; model: MapModel; cutaway: Cutaway };

/**
 * O que a mesa (tokens, névoa) pendura na área do mapa sem o editor conhecer essas features:
 * uma camada a mais na cena, o aviso de qual mapa está aberto e um pedido de releitura.
 */
export type TableBinding = {
  /** Camada extra da cena 3D. Vem pronta para o lazy (dentro de um Suspense). */
  sceneLayer?: ReactNode;
  onView?: (view: MapView | null) => void;
  /** Muda quando algo fora do mapa (a névoa) pede ao jogador para reler o mapa. */
  reloadKey?: number;
};

/** Conta à mesa qual mapa está na tela; ao sair, que nenhum. */
export function useReportView(table: TableBinding | undefined, view: MapView | null): void {
  const onView = table?.onView;
  const mapId = view?.mapId;
  const model = view?.model;
  const cutaway = view?.cutaway ?? null;
  useEffect(() => {
    if (!onView) return;
    onView(mapId && model ? { mapId, model, cutaway } : null);
  }, [onView, mapId, model, cutaway]);
  useEffect(() => () => onView?.(null), [onView]);
}
