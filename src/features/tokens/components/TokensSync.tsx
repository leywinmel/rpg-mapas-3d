import { useEffect, useRef, useState } from 'react';
import type { PieceMovedMessage } from '@/domain/map-v2';
import { useRoomSession } from '@/features/rooms';
import { useTokensStore } from '../hooks/tokens-store';
import { openTokensChannel, type TokensChannel } from '../services/tokens-channel';
import {
  connectTokensChannel,
  createTokenActions,
  createTokensReloader,
} from '../services/tokens-runtime';
import { getTokensService, type TokensService } from '../services/tokens-service';

export type TokensDependencies = {
  service: TokensService;
  openChannel: typeof openTokensChannel;
};

/**
 * Liga os tokens do mapa aberto ao banco e ao canal da mesa: carrega a lista, escuta quem
 * arrasta e quem grava, e monta as ações que a cena e o painel usam. Não desenha nada.
 */
export type TokensSyncProps = {
  dependencies?: Partial<TokensDependencies>;
  /** Recebe o aviso de peça do cenário movida pelo mestre (RPG-27), que chega por este canal. */
  onPieceMoved?: (message: PieceMovedMessage) => void;
};

export function TokensSync({ dependencies, onPieceMoved }: TokensSyncProps) {
  const { room, viewer } = useRoomSession();
  const [service] = useState(() => dependencies?.service ?? getTokensService());
  const [openChannel] = useState(() => dependencies?.openChannel ?? openTokensChannel);
  const [reloader] = useState(() => createTokensReloader(service));
  const mapId = useTokensStore((state) => state.view?.mapId ?? null);
  const channelRef = useRef<TokensChannel | null>(null);
  // Num ref: trocar quem ouve não pode reabrir o canal.
  const pieceListener = useRef(onPieceMoved);
  useEffect(() => {
    pieceListener.current = onPieceMoved;
  }, [onPieceMoved]);

  useEffect(() => {
    if (mapId) reloader.now();
    return reloader.cancel;
  }, [mapId, reloader]);

  useEffect(() => {
    const channel = connectTokensChannel({
      roomId: room.id,
      service,
      openChannel,
      reloader,
      onPieceMoved: (message) => pieceListener.current?.(message),
    });
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [room.id, service, openChannel, reloader]);

  useEffect(() => {
    const { actions, dispose } = createTokenActions({
      service,
      viewer,
      channel: () => channelRef.current,
      reloader,
    });
    useTokensStore.getState().setActions(actions);
    return () => {
      dispose();
      useTokensStore.getState().setActions(null);
    };
  }, [service, viewer, reloader]);

  // A mesa fechou: nada de tokens dela na próxima.
  useEffect(() => () => useTokensStore.getState().reset(), []);

  return null;
}
