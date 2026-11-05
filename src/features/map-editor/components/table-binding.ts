import { useEffect, useState, type ReactNode } from 'react';
import type { Cutaway, MapModel } from '@/domain/map-v2';
import { reuseUnchangedChunks } from '@/features/scene/chunks/stable-model';
import type { ModelUrls } from '@/features/scene/components/AssetPieces';

/** O mapa na tela de quem olha: o do editor do mestre ou o da mesa, para o jogador. */
export type MapView = {
  mapId: string;
  model: MapModel;
  cutaway: Cutaway;
  /** Nome do mapa (dá nome aos arquivos exportados). */
  name?: string;
  /** Endereços dos modelos .glb enviados (o .glb exportado inclui esses modelos). */
  modelUrls?: ModelUrls;
};

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
  /**
   * Ajusta o mapa que a cena desenha, sem mexer no que o editor edita nem no que vai ao banco
   * (RPG-27: o objeto que o mestre moveu sai do pedaço enquanto desliza). Uma função nova a cada
   * mudança do que ela sobrepõe; devolve o mesmo modelo quando não há nada a sobrepor.
   */
  adjustModel?: (mapId: string, model: MapModel) => MapModel;
};

export type ModelAdjuster = NonNullable<TableBinding['adjustModel']>;

type Shown = {
  mapId: string | null;
  source: MapModel | null;
  adjust: ModelAdjuster | undefined;
  shown: MapModel | null;
};

/**
 * O mapa que a cena desenha: o de origem com o ajuste da mesa. Os pedaços de conteúdo igual ao
 * do quadro anterior voltam a ser os mesmos objetos: quando o banco devolve o objeto no lugar
 * em que ele já estava na tela, nenhum pedaço é redesenhado (nada pisca nem pula).
 */
export function useShownModel<M extends MapModel | null>(
  mapId: string | null,
  model: M,
  adjust: ModelAdjuster | undefined,
): M {
  const [cache, setCache] = useState<Shown>({ mapId, source: model, adjust, shown: model });
  if (!adjust) return model;
  if (cache.source === model && cache.adjust === adjust && cache.mapId === mapId) {
    return cache.shown as M;
  }
  const previous = cache.mapId === mapId ? cache.shown : null;
  const shown = model && mapId ? reuseUnchangedChunks(previous, adjust(mapId, model)) : model;
  // Estado derivado do que veio de fora: o React refaz este render com o valor novo.
  setCache({ mapId, source: model, adjust, shown });
  return shown as M;
}

/** Conta à mesa qual mapa está na tela; ao sair, que nenhum. */
export function useReportView(table: TableBinding | undefined, view: MapView | null): void {
  const onView = table?.onView;
  const mapId = view?.mapId;
  const model = view?.model;
  const cutaway = view?.cutaway ?? null;
  const name = view?.name;
  const modelUrls = view?.modelUrls;
  useEffect(() => {
    if (!onView) return;
    onView(mapId && model ? { mapId, model, cutaway, name, modelUrls } : null);
  }, [onView, mapId, model, cutaway, name, modelUrls]);
  useEffect(() => () => onView?.(null), [onView]);
}
