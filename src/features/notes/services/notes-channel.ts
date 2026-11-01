import type { RealtimeChannel } from '@supabase/supabase-js';
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

type OpenChannel = {
  channel: RealtimeChannel;
  client: AppSupabaseClient;
  /** Trocável: quem reabre o canal passa a receber os eventos sem assinar de novo. */
  handlers: NotesChannelHandlers;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

/**
 * O Supabase devolve o MESMO canal para o mesmo nome e só o desmonta depois de uma ida
 * ao servidor. Fechar e reabrir em seguida (o modo estrito do React faz isso) pegaria um
 * canal morrendo. Por isso o fechamento espera um instante e é cancelado se a mesa for
 * reaberta. (Mesma técnica do canal da mesa, em features/rooms.)
 */
const openChannels = new Map<string, OpenChannel>();

function createEntry(options: NotesChannelOptions, client: AppSupabaseClient): OpenChannel {
  const { roomId } = options;
  const channel = client.channel(notesChannelName(roomId), {
    // Privado: só membros da mesa entram e enviam (regras em realtime.messages).
    config: { private: true },
  });
  const entry: OpenChannel = { channel, client, handlers: options.handlers, closeTimer: null };
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
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      entry.handlers.onConnectionProblem(error ?? new Error(`Canal das anotações: ${status}`));
    }
  });
  return entry;
}

/** Canal privado `notes:<id da mesa>`, só para membros: avisa quando as anotações mudam. */
export function openNotesChannel(
  options: NotesChannelOptions,
  client: AppSupabaseClient = getSupabase(),
): NotesChannel {
  const name = notesChannelName(options.roomId);
  const reused = openChannels.get(name);
  if (reused?.closeTimer) clearTimeout(reused.closeTimer);
  const entry = reused ?? createEntry(options, client);
  entry.handlers = options.handlers;
  entry.closeTimer = null;
  openChannels.set(name, entry);

  return {
    async announce() {
      const result = await entry.channel.send({
        type: 'broadcast',
        event: NOTES_ANNOUNCEMENT,
        payload: {},
      });
      if (result !== 'ok') throw new Error(`Aviso das anotações não entregue: ${result}`);
    },
    close() {
      entry.closeTimer = setTimeout(() => {
        openChannels.delete(name);
        void entry.client.removeChannel(entry.channel);
      }, 0);
    },
  };
}
