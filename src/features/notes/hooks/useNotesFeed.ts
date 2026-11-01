import { useCallback, useEffect, useRef, useState } from 'react';
import { NOTES_PAGE_SIZE } from '../constants';
import type { NotesService } from '../services/notes-service';
import { reportNoteFailure } from '../services/report-note-failure';
import type { Note } from '../types';
import type { NotesFeed } from './notes-context';

/** Uma carga que deu certo: a lista de agora e a de antes (nula na primeira carga). */
export type FeedLoad = { previous: readonly Note[] | null; next: readonly Note[] };

export type UseNotesFeedOptions = {
  roomId: string;
  service: Pick<NotesService, 'listNotes'>;
  onLoaded: (load: FeedLoad) => void;
};

/**
 * A lista de anotações da mesa numa janela que cresce: começa com uma página e "Ver mais
 * antigas" soma outra. Recarregar mantém o que já está na tela até o novo chegar, e uma
 * falha numa recarga não derruba a lista (só a primeira carga vira ErrorState).
 */
export function useNotesFeed({ roomId, service, onLoaded }: UseNotesFeedOptions) {
  const [feed, setFeed] = useState<NotesFeed>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  // Tamanho da janela que deu certo por último; só avança quando a carga maior chega.
  const windowRef = useRef(NOTES_PAGE_SIZE);
  // Numera os pedidos: só a resposta do mais recente vale.
  const requestRef = useRef(0);
  const knownRef = useRef<readonly Note[] | null>(null);
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  const load = useCallback(
    async (limit: number) => {
      const request = ++requestRef.current;
      try {
        const page = await service.listNotes({ roomId, limit });
        if (request !== requestRef.current) return;
        const previous = knownRef.current;
        knownRef.current = page.notes;
        windowRef.current = limit;
        setFeed({ status: 'ready', notes: page.notes, hasMore: page.hasMore });
        setLoadingMore(false);
        onLoadedRef.current({ previous, next: page.notes });
      } catch (error) {
        if (request !== requestRef.current) return;
        setLoadingMore(false);
        const hasList = knownRef.current !== null;
        reportNoteFailure(error, { action: 'list', toast: hasList });
        if (!hasList) setFeed({ status: 'error', error });
      }
    },
    [roomId, service],
  );

  useEffect(() => {
    void load(windowRef.current);
    return () => {
      // Desmontar (ou trocar de mesa) invalida o pedido em voo.
      requestRef.current += 1;
    };
  }, [load]);

  /** Sem lista ainda (primeira carga que falhou), tentar de novo volta para "carregando". */
  const reload = useCallback(() => {
    if (knownRef.current === null) setFeed({ status: 'loading' });
    void load(windowRef.current);
  }, [load]);

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    void load(windowRef.current + NOTES_PAGE_SIZE);
  }, [load]);

  return { feed, loadingMore, reload, loadMore };
}
