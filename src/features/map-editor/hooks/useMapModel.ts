import { useEffect, useState } from 'react';
import type { MapModel } from '@/domain/map-v2';
import { reportError } from '@/lib/report-error';
import { MapError } from '../services/map-errors';
import type { LoadedMapV2 } from '../services/map-v2-service';
import { useMapEditorServices } from '../services/services-context';

export type LoadedMap = LoadedMapV2;

export type MapModelState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; map: LoadedMap }
  | { status: 'error'; reason: 'load' | 'invalid' };

type Settled = {
  mapId: string;
  /** Qual pedido gerou o resultado: um erro antigo não vale para uma nova tentativa. */
  requestKey: string;
  result: Extract<MapModelState, { status: 'ready' | 'error' }>;
};

export type UseMapModelOptions = {
  /** Muda quando o tempo real avisa que o mapa foi gravado: busca de novo. */
  revision?: number;
  /** Muda no "Tentar de novo" depois de um erro. */
  attempt?: number;
  /**
   * Ajusta o mapa que chegou com base no que está na tela (ex: reaproveitar os pedaços que não
   * mudaram, para a cena redesenhar só o que a gravação mexeu). Passe uma função estável:
   * trocá-la busca o mapa de novo.
   */
  settle?: (previous: MapModel | null, next: MapModel) => MapModel;
};

/**
 * Carrega o mapa no formato v2 (o v1 chega convertido). Quando `revision` muda, busca de novo
 * sem piscar a tela: o mapa antigo fica até o novo chegar.
 */
export function useMapModel(mapId: string | null, options: UseMapModelOptions = {}): MapModelState {
  const { revision = 0, attempt = 0, settle: adjust } = options;
  const { mapsV2: service } = useMapEditorServices();
  const [settled, setSettled] = useState<Settled | null>(null);
  const requestKey = `${mapId}:${revision}:${attempt}`;

  useEffect(() => {
    if (!mapId) return;
    let cancelled = false;
    const finish = (result: Settled['result']) => {
      if (cancelled) return;
      setSettled((previous) => {
        if (result.status !== 'ready' || !adjust) return { mapId, requestKey, result };
        const shown =
          previous?.mapId === mapId && previous.result.status === 'ready'
            ? previous.result.map.model
            : null;
        const model = adjust(shown, result.map.model);
        return { mapId, requestKey, result: { status: 'ready', map: { ...result.map, model } } };
      });
    };
    service
      .loadMapV2(mapId)
      .then((map) => finish({ status: 'ready', map }))
      .catch((error: unknown) => {
        const invalid = error instanceof MapError && error.kind === 'unreadable';
        reportError(error, {
          userMessage: invalid
            ? 'Este mapa está num formato que não reconhecemos.'
            : 'Não conseguimos abrir o mapa.',
          context: { feature: 'map-editor', action: 'load-map', mapId },
          toast: false,
        });
        finish({ status: 'error', reason: invalid ? 'invalid' : 'load' });
      });
    return () => {
      cancelled = true;
    };
  }, [service, mapId, requestKey, adjust]);

  if (!mapId) return { status: 'idle' };
  if (!settled || settled.mapId !== mapId) return { status: 'loading' };
  // Nova tentativa depois de um erro mostra "carregando"; o mapa pronto fica até o novo chegar.
  if (settled.result.status === 'error' && settled.requestKey !== requestKey) {
    return { status: 'loading' };
  }
  return settled.result;
}
