import { logger } from '@/lib/logger';
import {
  createChannelRegistry,
  isChannelFailure,
  sendBroadcast,
  type SharedChannelEntry,
} from '@/lib/realtime-channel';
import { pieceMovedMessageSchema, type PieceMovedMessage } from '@/domain/map-v2';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { TOKEN_EVENTS } from '../constants';
import { dragMessageSchema, tokenIdMessageSchema, type DragMessage } from '../schemas';

export type TokensChannelHandlers = {
  /** Alguém arrasta um token que ainda está à vista de todos. */
  onDrag: (message: DragMessage) => void;
  /** Um token foi gravado: reler a linha (o RLS decide se ela ainda aparece). */
  onSaved: (tokenId: string) => void;
  onRemoved: (tokenId: string) => void;
  /** O mestre moveu uma peça do cenário que está à vista de todos. */
  onPieceMoved: (message: PieceMovedMessage) => void;
  /** Conectou ou reconectou: pode ter perdido avisos no meio. */
  onConnected: () => void;
  onConnectionProblem: (error: unknown) => void;
};

export type TokensChannel = {
  sendDrag: (message: DragMessage) => Promise<void>;
  announceSaved: (tokenId: string) => Promise<void>;
  announceRemoved: (tokenId: string) => Promise<void>;
  announcePieceMoved: (message: PieceMovedMessage) => Promise<void>;
  close: () => void;
};

export function tokensChannelName(roomId: string): string {
  return `tokens:${roomId}`;
}

type OpenChannel = SharedChannelEntry<TokensChannelHandlers>;

const channels = createChannelRegistry<TokensChannelHandlers>();

/** Qualquer membro pode mandar lixo no canal: o que não confere é ignorado (com aviso no log). */
function parsed<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  payload: unknown,
  action: string,
): T | null {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;
  logger.warn('Aviso de token inválido ignorado.', { feature: 'tokens', action });
  return null;
}

function listen(entry: OpenChannel): void {
  entry.channel
    .on('broadcast', { event: TOKEN_EVENTS.drag }, ({ payload }) => {
      const message = parsed(dragMessageSchema, payload, 'receive-drag');
      if (message) entry.handlers.onDrag(message);
    })
    .on('broadcast', { event: TOKEN_EVENTS.saved }, ({ payload }) => {
      const message = parsed(tokenIdMessageSchema, payload, 'receive-saved');
      if (message) entry.handlers.onSaved(message.tokenId);
    })
    .on('broadcast', { event: TOKEN_EVENTS.removed }, ({ payload }) => {
      const message = parsed(tokenIdMessageSchema, payload, 'receive-removed');
      if (message) entry.handlers.onRemoved(message.tokenId);
    })
    .on('broadcast', { event: TOKEN_EVENTS.pieceMoved }, ({ payload }) => {
      const message = parsed(pieceMovedMessageSchema, payload, 'receive-piece-moved');
      if (message) entry.handlers.onPieceMoved(message);
    });
  entry.channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      entry.handlers.onConnected();
      return;
    }
    if (isChannelFailure(status)) {
      entry.handlers.onConnectionProblem(error ?? new Error(`Canal dos tokens: ${status}`));
    }
  });
}

/**
 * Canal privado `tokens:<id da mesa>`, só para membros. Leva só ids e casas: quem recebe um
 * "token gravado" relê a linha, e o RLS decide se ela ainda aparece (escondida ou sob a névoa,
 * não aparece). Por isso o canal nunca entrega o que o jogador não pode ver.
 */
export function openTokensChannel(
  options: { roomId: string; handlers: TokensChannelHandlers },
  client: AppSupabaseClient = getSupabase(),
): TokensChannel {
  const { entry, close } = channels.acquire({
    name: tokensChannelName(options.roomId),
    client,
    handlers: options.handlers,
    config: { private: true },
    setup: listen,
  });
  return {
    sendDrag: (message) => sendBroadcast(entry.channel, TOKEN_EVENTS.drag, message),
    announceSaved: (tokenId) => sendBroadcast(entry.channel, TOKEN_EVENTS.saved, { tokenId }),
    announceRemoved: (tokenId) => sendBroadcast(entry.channel, TOKEN_EVENTS.removed, { tokenId }),
    announcePieceMoved: (message) => sendBroadcast(entry.channel, TOKEN_EVENTS.pieceMoved, message),
    close,
  };
}
