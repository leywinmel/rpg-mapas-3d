import { useAsyncData } from '@/lib/use-async-data';
import { logAndRethrow } from '../services/report-room-failure';
import { getRoomsService } from '../services/rooms-service';
import type { RoomSummary } from '../types';

/** "Minhas mesas" de quem está logado. Sem usuário, fica carregando (a página nem mostra). */
export function useMyRooms(userId: string | null) {
  return useAsyncData<RoomSummary[]>(userId ? `my-rooms:${userId}` : null, () =>
    userId
      ? getRoomsService().listMyRooms(userId).catch(logAndRethrow('list-my-rooms'))
      : Promise.resolve([]),
  );
}
