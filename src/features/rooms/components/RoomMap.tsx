import { useCallback, useMemo } from 'react';
import type { Cutaway } from '@/domain/map-v2';
import { MapWorkspace, type MapView, type TableBinding } from '@/features/map-editor';
import { FogSceneLayer, FogSync, useFogStore } from '@/features/fog';
import { TokensSceneLayer, TokensSync, useTokensStore } from '@/features/tokens';
import { useRoomControls, useRoomSession } from '../hooks/room-session-context';
import { getRoomsService } from '../services/rooms-service';

/**
 * Mapa da mesa aberta. O papel vem da sessão da sala, que acompanha mudanças
 * em tempo real; o banco (RLS) continua sendo quem decide no fim.
 */
/** O mapa na tela vai para os tokens (fora do React: a cena e o painel leem o mesmo estado). */
function showView(view: MapView | null) {
  useTokensStore.getState().setView(view);
}

const SCENE_LAYER = (
  <>
    <TokensSceneLayer />
    <FogSceneLayer />
  </>
);

export function RoomMap() {
  const { room, isGameMaster } = useRoomSession();
  const { replaceRoom } = useRoomControls();
  const roomId = room.id;
  // Mudou a névoa: o jogador relê o mapa (o banco só manda o que está descoberto).
  const fogRevision = useFogStore((state) => state.revision);
  const table = useMemo<TableBinding>(
    () => ({ sceneLayer: SCENE_LAYER, onView: showView, reloadKey: fogRevision }),
    [fogRevision],
  );
  // A trava volta do banco e entra na sessão na hora; os jogadores a recebem pelo canal da mesa.
  const changeCutawayLock = useCallback(
    async (lock: Cutaway) => replaceRoom(await getRoomsService().setCutawayLock(roomId, lock)),
    [roomId, replaceRoom],
  );
  return (
    <>
      <TokensSync />
      <FogSync />
      <MapWorkspace
        roomId={roomId}
        isGameMaster={isGameMaster}
        cutawayLock={room.cutawayLock}
        onCutawayLockChange={isGameMaster ? changeCutawayLock : undefined}
        table={table}
      />
    </>
  );
}
