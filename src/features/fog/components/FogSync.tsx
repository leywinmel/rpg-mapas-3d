import { useEffect, useState } from 'react';
import { useRoomSession } from '@/features/rooms';
import { useTokensStore } from '@/features/tokens';
import { useFogStore } from '../hooks/fog-store';
import { openFogChannel } from '../services/fog-channel';
import {
  connectFogChannel,
  createChannelSlot,
  createFogLoader,
  createFogSaver,
  fogCovers,
} from '../services/fog-runtime';
import { getFogService, type FogService } from '../services/fog-service';

export type FogDependencies = { service: FogService; openChannel: typeof openFogChannel };

/**
 * Liga a névoa do mapa aberto ao banco e ao canal da mesa. O mapa aberto vem do mesmo lugar que
 * o dos tokens (a área do mapa conta qual está na tela). Não desenha nada.
 */
export function FogSync({ dependencies }: { dependencies?: Partial<FogDependencies> }) {
  const { room, isGameMaster } = useRoomSession();
  const [service] = useState(() => dependencies?.service ?? getFogService());
  const [openChannel] = useState(() => dependencies?.openChannel ?? openFogChannel);
  const [load] = useState(() => createFogLoader(service));
  const [slot] = useState(createChannelSlot);
  const [saver] = useState(() => createFogSaver({ service, channel: slot.get }));
  const mapId = useTokensStore((state) => state.view?.mapId ?? null);
  const width = useTokensStore((state) => state.view?.model.size.width ?? 0);
  const depth = useTokensStore((state) => state.view?.model.size.depth ?? 0);
  const loadAttempt = useFogStore((state) => state.loadAttempt);

  useEffect(() => {
    // Trocar de mapa grava o que faltava do anterior antes de ler o novo.
    saver.flush();
    useFogStore.getState().setMap(mapId);
    if (mapId) void load(mapId, { width, depth });
  }, [mapId, width, depth, loadAttempt, load, saver]);

  useEffect(() => {
    const channel = connectFogChannel({
      roomId: room.id,
      openChannel,
      reload: (changedId) => {
        const view = useTokensStore.getState().view;
        if (view?.mapId === changedId) void load(changedId, view.model.size);
      },
    });
    slot.set(channel);
    return () => {
      channel.close();
      slot.set(null);
    };
  }, [room.id, openChannel, load, slot]);

  useEffect(() => {
    if (!isGameMaster) return;
    const unsubscribe = useFogStore.subscribe((state, previous) => {
      // Pincelada nova ou "tentar de novo" depois de uma falha: grava na próxima pausa.
      const retried = previous.saveStatus === 'error' && state.saveStatus === 'pending';
      if (state.saveStatus === 'pending' && (state.fog !== previous.fog || retried)) {
        saver.schedule();
      }
    });
    return () => {
      unsubscribe();
      saver.flush();
    };
  }, [isGameMaster, saver]);

  useEffect(() => {
    useTokensStore.getState().setFogCovers(fogCovers);
    return () => {
      useTokensStore.getState().setFogCovers(null);
      useFogStore.getState().reset();
    };
  }, []);

  return null;
}
