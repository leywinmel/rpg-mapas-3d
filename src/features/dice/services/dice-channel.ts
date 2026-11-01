import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { DICE_EVENTS } from '../constants';
import { throwMessageSchema, type ThrowMessage } from '../schemas';
import type { DiceRoll } from '../types';
import { toDiceRoll, type DiceRollRow } from './roll-row';

export type DiceChannelHandlers = {
  /** Alguém rolou em público: hora de animar a mesma jogada. */
  onThrow: (message: ThrowMessage) => void;
  /** Uma rolagem nova que o RLS deixa esta pessoa ver (as escondidas só chegam ao mestre). */
  onRollInserted: (roll: DiceRoll) => void;
  /** O mestre limpou o histórico (o Realtime não filtra DELETE por mesa, então ele avisa). */
  onHistoryCleared: () => void;
  /** O canal conectou ou reconectou: pode ter perdido rolagens no meio. */
  onConnected: () => void;
  onConnectionProblem: (error: unknown) => void;
};

export type DiceChannelOptions = {
  roomId: string;
  handlers: DiceChannelHandlers;
};

export type DiceChannel = {
  /** Avisa a mesa de uma rolagem pública. Falha se o servidor não aceitou. */
  sendThrow: (message: ThrowMessage) => Promise<void>;
  /** Avisa que o histórico foi limpo. */
  announceCleared: () => Promise<void>;
  close: () => void;
};

export function diceChannelName(roomId: string): string {
  return `dice:${roomId}`;
}

type OpenChannel = {
  channel: RealtimeChannel;
  client: AppSupabaseClient;
  /** Trocável: quem reabre o canal passa a receber os eventos sem assinar de novo. */
  handlers: DiceChannelHandlers;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

/**
 * O Supabase devolve o MESMO canal para o mesmo nome e só o desmonta depois de uma ida
 * ao servidor. Fechar e reabrir em seguida (o modo estrito do React faz isso) pegaria um
 * canal morrendo. Por isso o fechamento espera um instante e é cancelado se a mesa for
 * reaberta. (Mesmo cuidado de `openRoomChannel`.)
 */
const openChannels = new Map<string, OpenChannel>();

function receiveThrow(entry: OpenChannel, payload: unknown): void {
  const parsed = throwMessageSchema.safeParse(payload);
  if (!parsed.success) {
    // Qualquer membro pode mandar lixo no canal; ignora sem incomodar a mesa.
    logger.warn('Arremesso inválido ignorado.', { feature: 'dice', action: 'receive-throw' });
    return;
  }
  entry.handlers.onThrow(parsed.data);
}

function listenToChannel(entry: OpenChannel, roomId: string): void {
  entry.channel
    .on('broadcast', { event: DICE_EVENTS.throw }, ({ payload }) => receiveThrow(entry, payload))
    .on('broadcast', { event: DICE_EVENTS.historyCleared }, () => entry.handlers.onHistoryCleared())
    .on<DiceRollRow>(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dice_rolls', filter: `room_id=eq.${roomId}` },
      (payload) => entry.handlers.onRollInserted(toDiceRoll(payload.new)),
    );
}

function createEntry(options: DiceChannelOptions, client: AppSupabaseClient): OpenChannel {
  const channel = client.channel(diceChannelName(options.roomId), {
    // Privado: o Realtime só deixa entrar e enviar quem o banco reconhece como membro da
    // mesa (regras em realtime.messages); saber o id da mesa não basta.
    config: { private: true },
  });
  const entry: OpenChannel = { channel, client, handlers: options.handlers, closeTimer: null };
  listenToChannel(entry, options.roomId);
  channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      entry.handlers.onConnected();
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      entry.handlers.onConnectionProblem(error ?? new Error(`Canal dos dados: ${status}`));
    }
  });
  return entry;
}

async function broadcast(entry: OpenChannel, event: string, payload: unknown): Promise<void> {
  const response = await entry.channel.send({ type: 'broadcast', event, payload });
  if (response !== 'ok') throw new Error(`Aviso "${event}" não entregue: ${response}.`);
}

/**
 * Canal privado `dice:<id da mesa>`, só para membros: avisos de arremesso e de histórico
 * limpo (broadcast) e as rolagens novas vindas do banco (o Realtime respeita o RLS).
 */
export function openDiceChannel(
  options: DiceChannelOptions,
  client: AppSupabaseClient = getSupabase(),
): DiceChannel {
  const name = diceChannelName(options.roomId);
  const reused = openChannels.get(name);
  if (reused?.closeTimer) clearTimeout(reused.closeTimer);
  const entry = reused ?? createEntry(options, client);
  entry.handlers = options.handlers;
  entry.closeTimer = null;
  openChannels.set(name, entry);

  return {
    sendThrow: (message) => broadcast(entry, DICE_EVENTS.throw, message),
    announceCleared: () => broadcast(entry, DICE_EVENTS.historyCleared, {}),
    close() {
      entry.closeTimer = setTimeout(() => {
        openChannels.delete(name);
        void entry.client.removeChannel(entry.channel);
      }, 0);
    },
  };
}
