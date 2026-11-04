import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createChannelRegistry, isChannelFailure, sendBroadcast } from '@/lib/realtime-channel';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { FOG_EVENTS } from '../constants';

export type FogChannelHandlers = {
  /** O mestre gravou a névoa deste mapa: reler a névoa, o mapa e os tokens. */
  onChanged: (mapId: string) => void;
  onConnectionProblem: (error: unknown) => void;
};

export type FogChannel = { announce: (mapId: string) => Promise<void>; close: () => void };

const changedSchema = z.object({ mapId: z.uuid() });
const channels = createChannelRegistry<FogChannelHandlers>();

export function fogChannelName(roomId: string): string {
  return `fog:${roomId}`;
}

/**
 * Canal privado `fog:<id da mesa>`. Leva só o id do mapa: o que ficou à vista ou coberto cada
 * um relê do banco, e o RLS decide o que o jogador recebe.
 */
export function openFogChannel(
  options: { roomId: string; handlers: FogChannelHandlers },
  client: AppSupabaseClient = getSupabase(),
): FogChannel {
  const { entry, close } = channels.acquire({
    name: fogChannelName(options.roomId),
    client,
    handlers: options.handlers,
    config: { private: true },
    setup: (opened) => {
      opened.channel.on('broadcast', { event: FOG_EVENTS.changed }, ({ payload }) => {
        const message = changedSchema.safeParse(payload);
        if (message.success) opened.handlers.onChanged(message.data.mapId);
        else logger.warn('Aviso de névoa inválido ignorado.', { feature: 'fog' });
      });
      opened.channel.subscribe((status, error) => {
        if (isChannelFailure(status)) {
          opened.handlers.onConnectionProblem(error ?? new Error(`Canal da névoa: ${status}`));
        }
      });
    },
  });
  return {
    announce: (mapId) => sendBroadcast(entry.channel, FOG_EVENTS.changed, { mapId }),
    close,
  };
}
