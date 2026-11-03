import {
  createChannelRegistry,
  isChannelFailure,
  sendBroadcast,
  type SharedChannelEntry,
} from '@/lib/realtime-channel';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { NOTES_ANNOUNCEMENT } from '../constants';

export type NotesChannelHandlers = {
  /**
   * A lista pode ter mudado: o banco avisou, o mestre avisou ou o canal (re)entrou. O sinal
   * não leva conteúdo; quem recebe recarrega a lista pelo serviço, que respeita o RLS.
   */
  onSignal: () => void;
  onConnectionProblem: (error: unknown) => void;
};

export type NotesChannelOptions = {
  roomId: string;
  handlers: NotesChannelHandlers;
};

export type NotesChannel = {
  /** O mestre avisa a mesa depois de enviar, editar ou apagar uma anotação. */
  announce: () => Promise<void>;
  close: () => void;
};

export function notesChannelName(roomId: string): string {
  return `notes:${roomId}`;
}

type OpenChannel = SharedChannelEntry<NotesChannelHandlers>;

const channels = createChannelRegistry<NotesChannelHandlers>();

function subscribeToNotes(entry: OpenChannel, roomId: string): void {
  const { channel } = entry;
  const signal = () => entry.handlers.onSignal();
  const filter = `room_id=eq.${roomId}`;

  // Os ouvintes entram ANTES do subscribe(): depois dele o Realtime recusa e o canal quebra.
  // O RLS filtra INSERT e UPDATE por pessoa; DELETE não é filtrável por mesa, por isso o aviso.
  channel
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes', filter }, signal)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notes', filter }, signal)
    .on('broadcast', { event: NOTES_ANNOUNCEMENT }, signal);

  channel.subscribe((status, error) => {
    // Entrar e voltar de uma queda caem aqui: o que mudou nesse meio-tempo só se descobre recarregando.
    if (status === 'SUBSCRIBED') {
      signal();
      return;
    }
    if (isChannelFailure(status)) {
      entry.handlers.onConnectionProblem(error ?? new Error(`Canal das anotações: ${status}`));
    }
  });
}

/** Canal privado `notes:<id da mesa>`, só para membros: avisa quando as anotações mudam. */
export function openNotesChannel(
  options: NotesChannelOptions,
  client: AppSupabaseClient = getSupabase(),
): NotesChannel {
  const { entry, close } = channels.acquire({
    name: notesChannelName(options.roomId),
    client,
    handlers: options.handlers,
    // Privado: só membros da mesa entram e enviam (regras em realtime.messages).
    config: { private: true },
    setup: (created) => subscribeToNotes(created, options.roomId),
  });

  return {
    announce: () => sendBroadcast(entry.channel, NOTES_ANNOUNCEMENT, {}),
    close,
  };
}
