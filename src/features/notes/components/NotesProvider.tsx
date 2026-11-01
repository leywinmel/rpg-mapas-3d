import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { canSendNotes } from '@/domain';
import { useRoomSession } from '@/features/rooms';
import { reportError } from '@/lib/report-error';
import { NOTES_RELOAD_DELAY_MS } from '../constants';
import { NotesContext, type NotesContextValue } from '../hooks/notes-context';
import { useNotesFeed } from '../hooks/useNotesFeed';
import { useUnreadNotes } from '../hooks/useUnreadNotes';
import { browserStorage, type LastSeenStorage } from '../services/last-seen-storage';
import { NoteError } from '../services/note-errors';
import { openNotesChannel, type NotesChannel } from '../services/notes-channel';
import { getNotesService, type NotesService } from '../services/notes-service';
import { reportNoteSideEffectFailure } from '../services/report-note-failure';
import { createCoalescer } from '../services/signal-coalescer';
import { countUnread } from '../services/unread';
import type { EditNoteInput, Note, NoteDraft } from '../types';

/** O que o provider usa de fora; os testes trocam por versões falsas. */
export type NotesDependencies = {
  service: NotesService;
  openChannel: typeof openNotesChannel;
  /** Nulo = sem armazenamento (a "última vista" vale só na sessão). */
  storage: LastSeenStorage | null;
};

export type NotesProviderProps = {
  /** O painel das anotações está aberto: o que chega nesse tempo entra como lido, sem aviso. */
  panelOpen: boolean;
  children: ReactNode;
  dependencies?: Partial<NotesDependencies>;
};

function isNotFound(error: unknown): boolean {
  return error instanceof NoteError && error.kind === 'not-found';
}

/**
 * Carrega as anotações da mesa, escuta o canal em tempo real e conta as não lidas. Vive o
 * tempo todo que a sala estiver aberta (com o painel fechado também), por isso o aviso de
 * anotação nova chega mesmo sem o painel. Precisa estar sob o RoomSessionProvider, que a
 * RoomPage remonta a cada mesa.
 */
export function NotesProvider({ panelOpen, children, dependencies }: NotesProviderProps) {
  const { room, viewer, members } = useRoomSession();
  const roomId = room.id;
  const userId = viewer.userId;
  const service = dependencies?.service ?? getNotesService();
  const openChannel = dependencies?.openChannel ?? openNotesChannel;
  const [storage] = useState(() =>
    dependencies?.storage === undefined ? browserStorage() : dependencies.storage,
  );
  const channelRef = useRef<NotesChannel | null>(null);

  const unread = useUnreadNotes({ userId, roomId, panelOpen, storage });
  const { feed, loadingMore, reload, loadMore } = useNotesFeed({
    roomId,
    service,
    onLoaded: unread.handleLoaded,
  });

  useEffect(() => {
    // Sinais em sequência (o banco e o aviso do mestre) viram uma recarga só.
    const reloadSoon = createCoalescer(reload, NOTES_RELOAD_DELAY_MS);
    let warned = false;
    const channel = openChannel({
      roomId,
      handlers: {
        onSignal: reloadSoon.trigger,
        onConnectionProblem: (error) => {
          // O cliente do Supabase reconecta sozinho; um aviso por visita basta.
          if (warned) return;
          warned = true;
          reportError(error, {
            userMessage: 'A conexão em tempo real das anotações falhou.',
            hint: 'Tentando reconectar. Se uma anotação nova não aparecer, abra o painel de novo.',
            context: { feature: 'notes', action: 'realtime' },
            severity: 'warn',
          });
        },
      },
    });
    channelRef.current = channel;
    return () => {
      reloadSoon.cancel();
      channel.close();
      channelRef.current = null;
    };
  }, [roomId, openChannel, reload]);

  /** O aviso aos outros é cortesia: se falhar, a ação principal já deu certo. */
  const announce = useCallback(async () => {
    try {
      await channelRef.current?.announce();
    } catch (error) {
      reportNoteSideEffectFailure(error, 'Não deu para avisar a mesa da mudança.', 'announce');
    }
  }, []);

  /** Depois de enviar, editar ou apagar: atualiza a lista de quem agiu e avisa os outros. */
  const settle = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (error) {
        // A anotação já não existe: a lista na tela está velha.
        if (isNotFound(error)) reload();
        throw error;
      }
      reload();
      void announce();
    },
    [reload, announce],
  );

  const sendNote = useCallback(
    (draft: NoteDraft) => settle(() => service.sendNote({ roomId, ...draft })),
    [settle, service, roomId],
  );
  const updateNote = useCallback(
    (input: EditNoteInput) => settle(() => service.updateNote(input)),
    [settle, service],
  );
  const deleteNote = useCallback(
    (note: Note) => settle(() => service.deleteNote(note)),
    [settle, service],
  );

  const canManage = canSendNotes(viewer);
  const unreadCount =
    feed.status === 'ready' ? countUnread(feed.notes, userId, unread.lastSeenAt) : 0;

  const value = useMemo<NotesContextValue>(
    () => ({
      viewerId: userId,
      canManage,
      members,
      feed,
      loadingMore,
      unreadCount,
      reload,
      loadMore,
      sendNote,
      updateNote,
      deleteNote,
      getImageUrl: service.getImageUrl,
    }),
    [
      userId,
      canManage,
      members,
      feed,
      loadingMore,
      unreadCount,
      reload,
      loadMore,
      sendNote,
      updateNote,
      deleteNote,
      service.getImageUrl,
    ],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}
