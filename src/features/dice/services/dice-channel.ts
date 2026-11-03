import { logger } from '@/lib/logger';
import {
  createChannelRegistry,
  isChannelFailure,
  sendBroadcast,
  type SharedChannelEntry,
} from '@/lib/realtime-channel';
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

type OpenChannel = SharedChannelEntry<DiceChannelHandlers>;

const channels = createChannelRegistry<DiceChannelHandlers>();

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

function subscribeToDice(entry: OpenChannel, roomId: string): void {
  listenToChannel(entry, roomId);
  entry.channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      entry.handlers.onConnected();
      return;
    }
    if (isChannelFailure(status)) {
      entry.handlers.onConnectionProblem(error ?? new Error(`Canal dos dados: ${status}`));
    }
  });
}

/**
 * Canal privado `dice:<id da mesa>`, só para membros: avisos de arremesso e de histórico
 * limpo (broadcast) e as rolagens novas vindas do banco (o Realtime respeita o RLS).
 */
export function openDiceChannel(
  options: DiceChannelOptions,
  client: AppSupabaseClient = getSupabase(),
): DiceChannel {
  const { entry, close } = channels.acquire({
    name: diceChannelName(options.roomId),
    client,
    handlers: options.handlers,
    // Privado: o Realtime só deixa entrar e enviar quem o banco reconhece como membro da
    // mesa (regras em realtime.messages); saber o id da mesa não basta.
    config: { private: true },
    setup: (created) => subscribeToDice(created, options.roomId),
  });

  return {
    sendThrow: (message) => sendBroadcast(entry.channel, DICE_EVENTS.throw, message),
    announceCleared: () => sendBroadcast(entry.channel, DICE_EVENTS.historyCleared, {}),
    close,
  };
}
