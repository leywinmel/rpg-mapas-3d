import { useEffect, useRef } from 'react';
import { canMoveScenery } from '@/domain';
import { useRoomSession } from '@/features/rooms';
import { useTokensStore } from '@/features/tokens';
import { useSceneryStore } from '../hooks/scenery-store';
import { handleGameMasterChange } from '../services/scenery-runtime';

/**
 * Do lado do mestre, olha o mapa que ele edita (o mesmo que a área do mapa conta aos tokens) e,
 * quando um carro ou objeto solto muda de lugar, faz a peça deslizar e avisa a mesa. Do lado do
 * jogador não faz nada: o aviso chega pelo canal dos tokens (TokensSync → receivePieceMoved).
 * Não desenha nada.
 */
export function ScenerySync() {
  const { room, viewer } = useRoomSession();
  const isGameMaster = canMoveScenery(viewer);
  // Num ref: o mestre trocar o mapa da mesa não pode perder a mudança que está chegando.
  const activeMapId = useRef(room.activeMapId);
  useEffect(() => {
    activeMapId.current = room.activeMapId;
  }, [room.activeMapId]);

  useEffect(() => {
    if (!isGameMaster) return;
    return useTokensStore.subscribe((state, previous) => {
      const next = state.view;
      const before = previous.view;
      if (!next || !before || next.mapId !== before.mapId || next.model === before.model) return;
      handleGameMasterChange({
        mapId: next.mapId,
        before: before.model,
        after: next.model,
        shared: next.mapId === activeMapId.current,
        covers: state.fogCovers,
        announce: (message) => state.actions?.announcePieceMoved(message),
        now: performance.now(),
      });
    });
  }, [isGameMaster]);

  // A mesa fechou: nada de peça deslizando na próxima.
  useEffect(() => () => useSceneryStore.getState().reset(), []);

  return null;
}
