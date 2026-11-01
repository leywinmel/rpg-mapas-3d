import { useEffect, useState } from 'react';
import { parseMapDocument, type MapDocument } from '@/domain';
import { reportError } from '@/lib/report-error';
import { useMapEditorServices } from '../services/services-context';
import type { MapSummary } from '../types';

export type LoadedMap = { summary: MapSummary; document: MapDocument };

export type MapDocumentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; map: LoadedMap }
  | { status: 'error'; reason: 'load' | 'invalid' };

type Settled = {
  mapId: string;
  /** Qual pedido gerou o resultado: um erro antigo não vale para uma nova tentativa. */
  requestKey: string;
  result: Extract<MapDocumentState, { status: 'ready' | 'error' }>;
};

/**
 * Carrega e valida o documento de um mapa. Quando `revision` muda (gravação
 * vista pelo tempo real), busca de novo sem piscar a tela: o mapa antigo fica
 * até o novo chegar.
 */
export function useMapDocument(mapId: string | null, revision = 0, attempt = 0): MapDocumentState {
  const { maps: service } = useMapEditorServices();
  const [settled, setSettled] = useState<Settled | null>(null);
  const requestKey = `${mapId}:${revision}:${attempt}`;

  useEffect(() => {
    if (!mapId) return;
    let cancelled = false;
    const settle = (result: Settled['result']) => {
      if (!cancelled) setSettled({ mapId, requestKey, result });
    };
    service
      .loadMap(mapId)
      .then((record) => {
        const { document: raw, ...summary } = record;
        const parsed = parseMapDocument(raw, summary);
        if (parsed.ok) {
          settle({ status: 'ready', map: { summary, document: parsed.value } });
          return;
        }
        reportError(new Error(parsed.errors.join(' | ')), {
          userMessage: 'Este mapa está num formato que não reconhecemos.',
          context: { feature: 'map-editor', action: 'parse-map', mapId },
          toast: false,
        });
        settle({ status: 'error', reason: 'invalid' });
      })
      .catch((error: unknown) => {
        reportError(error, {
          userMessage: 'Não conseguimos abrir o mapa.',
          context: { feature: 'map-editor', action: 'load-map', mapId },
          toast: false,
        });
        settle({ status: 'error', reason: 'load' });
      });
    return () => {
      cancelled = true;
    };
  }, [service, mapId, requestKey]);

  if (!mapId) return { status: 'idle' };
  if (!settled || settled.mapId !== mapId) return { status: 'loading' };
  // Nova tentativa depois de um erro mostra "carregando"; o mapa pronto fica até o novo chegar.
  if (settled.result.status === 'error' && settled.requestKey !== requestKey) {
    return { status: 'loading' };
  }
  return settled.result;
}
