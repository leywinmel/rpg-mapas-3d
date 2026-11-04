import { logger } from '@/lib/logger';
import {
  createChannelRegistry,
  isChannelFailure,
  sendBroadcast,
  type SharedChannelEntry,
} from '@/lib/realtime-channel';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { TABLE_EVENTS } from '../constants';
import {
  pingMessageSchema,
  rulerClearedMessageSchema,
  rulerMessageSchema,
  type PingMessage,
  type RulerClearedMessage,
  type RulerMessage,
} from '../schemas';

export type TableChannelHandlers = {
  onRuler: (message: RulerMessage) => void;
  onRulerCleared: (message: RulerClearedMessage) => void;
  onPing: (message: PingMessage) => void;
  onConnectionProblem: (error: unknown) => void;
};

export type TableChannel = {
  sendRuler: (message: RulerMessage) => Promise<void>;
  sendRulerCleared: (message: RulerClearedMessage) => Promise<void>;
  sendPing: (message: PingMessage) => Promise<void>;
  close: () => void;
};

export function tableChannelName(roomId: string): string {
  return `table:${roomId}`;
}

type OpenChannel = SharedChannelEntry<TableChannelHandlers>;

const channels = createChannelRegistry<TableChannelHandlers>();

type Parser<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

/** Liga um evento ao ouvinte, descartando (com aviso no log) o que não confere com o formato. */
function on<T>(entry: OpenChannel, event: string, schema: Parser<T>, deliver: (data: T) => void) {
  entry.channel.on('broadcast', { event }, ({ payload }) => {
    const parsed = schema.safeParse(payload);
    if (parsed.success) deliver(parsed.data);
    else logger.warn('Aviso da mesa inválido ignorado.', { feature: 'table-tools', event });
  });
}

function listen(entry: OpenChannel): void {
  on(entry, TABLE_EVENTS.ruler, rulerMessageSchema, (data) => entry.handlers.onRuler(data));
  on(entry, TABLE_EVENTS.rulerCleared, rulerClearedMessageSchema, (data) =>
    entry.handlers.onRulerCleared(data),
  );
  on(entry, TABLE_EVENTS.ping, pingMessageSchema, (data) => entry.handlers.onPing(data));
  entry.channel.subscribe((status, error) => {
    if (isChannelFailure(status)) {
      entry.handlers.onConnectionProblem(error ?? new Error(`Canal da mesa: ${status}`));
    }
  });
}

/**
 * Canal privado `table:<id da mesa>`, só para membros (regras em realtime.messages). Régua e ping
 * são efêmeros: só broadcast, nada gravado no banco.
 */
export function openTableChannel(
  options: { roomId: string; handlers: TableChannelHandlers },
  client: AppSupabaseClient = getSupabase(),
): TableChannel {
  const { entry, close } = channels.acquire({
    name: tableChannelName(options.roomId),
    client,
    handlers: options.handlers,
    config: { private: true },
    setup: listen,
  });
  return {
    sendRuler: (message) => sendBroadcast(entry.channel, TABLE_EVENTS.ruler, message),
    sendRulerCleared: (message) => sendBroadcast(entry.channel, TABLE_EVENTS.rulerCleared, message),
    sendPing: (message) => sendBroadcast(entry.channel, TABLE_EVENTS.ping, message),
    close,
  };
}
