import { MapWorkspace } from '@/features/map-editor';
import { useRoomSession } from '../hooks/room-session-context';

/**
 * Mapa da mesa aberta. O papel vem da sessão da sala, que acompanha mudanças
 * em tempo real; o banco (RLS) continua sendo quem decide no fim.
 */
export function RoomMap() {
  const { room, isGameMaster } = useRoomSession();
  return <MapWorkspace roomId={room.id} isGameMaster={isGameMaster} />;
}
