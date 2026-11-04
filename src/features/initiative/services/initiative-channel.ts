import { createChannelRegistry, isChannelFailure, sendBroadcast } from '@/lib/realtime-channel';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { INITIATIVE_EVENTS } from '../constants';

export type InitiativeChannelHandlers = {
  /** Alguém mudou a ordem: reler (o RLS decide o que aparece). */
  onChanged: () => void;
  /** Conectou ou reconectou: pode ter perdido avisos no meio. */
  onConnected: () => void;
  onConnectionProblem: (error: unknown) => void;
};

export type InitiativeChannel = { announce: () => Promise<void>; close: () => void };

const channels = createChannelRegistry<InitiativeChannelHandlers>();

export function initiativeChannelName(roomId: string): string {
  return `initiative:${roomId}`;
}

/**
 * Canal privado `initiative:<id da mesa>`. O aviso não leva nada: o nome de um token escondido
 * nunca passa pelo canal, e cada um relê a ordem pelo RLS.
 */
export function openInitiativeChannel(
  options: { roomId: string; handlers: InitiativeChannelHandlers },
  client: AppSupabaseClient = getSupabase(),
): InitiativeChannel {
  const { entry, close } = channels.acquire({
    name: initiativeChannelName(options.roomId),
    client,
    handlers: options.handlers,
    config: { private: true },
    setup: (opened) => {
      opened.channel.on('broadcast', { event: INITIATIVE_EVENTS.changed }, () =>
        opened.handlers.onChanged(),
      );
      opened.channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          opened.handlers.onConnected();
          return;
        }
        if (isChannelFailure(status)) {
          opened.handlers.onConnectionProblem(error ?? new Error(`Canal da iniciativa: ${status}`));
        }
      });
    },
  });
  return {
    announce: () => sendBroadcast(entry.channel, INITIATIVE_EVENTS.changed, {}),
    close,
  };
}
