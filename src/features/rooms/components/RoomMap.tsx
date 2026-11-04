import { useCallback } from 'react';
import type { Cutaway } from '@/domain/map-v2';
import { MapWorkspace } from '@/features/map-editor';
import { useRoomControls, useRoomSession } from '../hooks/room-session-context';
import { getRoomsService } from '../services/rooms-service';

/**
 * Mapa da mesa aberta. O papel vem da sessão da sala, que acompanha mudanças
 * em tempo real; o banco (RLS) continua sendo quem decide no fim.
 */
export function RoomMap() {
  const { room, isGameMaster } = useRoomSession();
  const { replaceRoom } = useRoomControls();
  const roomId = room.id;
  // A trava volta do banco e entra na sessão na hora; os jogadores a recebem pelo canal da mesa.
  const changeCutawayLock = useCallback(
    async (lock: Cutaway) => replaceRoom(await getRoomsService().setCutawayLock(roomId, lock)),
    [roomId, replaceRoom],
  );
  return (
    <MapWorkspace
      roomId={roomId}
      isGameMaster={isGameMaster}
      cutawayLock={room.cutawayLock}
      onCutawayLockChange={isGameMaster ? changeCutawayLock : undefined}
    />
  );
}
