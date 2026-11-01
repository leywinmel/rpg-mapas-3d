import { useCallback, useEffect, useRef, useState } from 'react';
import { notify } from '@/components';
import { readLastSeen, writeLastSeen, type LastSeenStorage } from '../services/last-seen-storage';
import { findArrivals, laterOf, newestCreatedAt } from '../services/unread';
import type { Note } from '../types';
import type { FeedLoad } from './useNotesFeed';

export type UseUnreadNotesOptions = {
  userId: string;
  roomId: string;
  /** O painel das anotações está aberto agora. */
  panelOpen: boolean;
  /** Nulo = sem armazenamento: a "última vista" vale só nesta sessão. */
  storage: LastSeenStorage | null;
};

/** Um aviso para o que chegou com o painel fechado: o título, se foi uma só; senão a contagem. */
function announceArrivals(arrivals: readonly Note[]): void {
  const [newest] = arrivals;
  if (!newest) return;
  if (arrivals.length === 1) {
    notify.info('Nova anotação', newest.title);
    return;
  }
  notify.info(`${arrivals.length} anotações novas`, 'Abra as anotações para ler.');
}

/**
 * "Última vista" da pessoa nesta mesa (guardada no navegador) e os avisos de anotação nova.
 *
 * - Na primeira vez que a pessoa vê a mesa (nada guardado), o que já existe conta como lido:
 *   assim, sem armazenamento, o contador vale só para o que chega na sessão.
 * - Chegou depois da carga inicial, não é dela e o painel está fechado: aviso e não lida.
 * - Painel aberto: a anotação entra na lista já como lida, sem aviso. Abrir o painel marca tudo.
 */
export function useUnreadNotes({ userId, roomId, panelOpen, storage }: UseUnreadNotesOptions) {
  const [lastSeenAt, setLastSeenAt] = useState(() => readLastSeen(storage, userId, roomId));
  const lastSeenRef = useRef(lastSeenAt);
  const panelOpenRef = useRef(panelOpen);
  const newestRef = useRef<string | null>(null);

  const markSeen = useCallback(
    (upTo: string | null) => {
      const next = laterOf(lastSeenRef.current, upTo);
      if (next === null || next === lastSeenRef.current) return;
      lastSeenRef.current = next;
      setLastSeenAt(next);
      writeLastSeen(storage, userId, roomId, next);
    },
    [storage, userId, roomId],
  );

  useEffect(() => {
    panelOpenRef.current = panelOpen;
    if (panelOpen) markSeen(newestRef.current);
  }, [panelOpen, markSeen]);

  const handleLoaded = useCallback(
    ({ previous, next }: FeedLoad) => {
      const newest = newestCreatedAt(next);
      newestRef.current = newest;
      const firstSight = previous === null && lastSeenRef.current === null;
      if (panelOpenRef.current || firstSight) {
        markSeen(newest);
        return;
      }
      announceArrivals(findArrivals(previous, next, userId));
    },
    [markSeen, userId],
  );

  return { lastSeenAt, handleLoaded };
}
