import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DoorClosed } from 'lucide-react';
import { ButtonLink, EmptyState } from '@/components';
import { isGameMaster, type Viewer } from '@/domain';
import type { SessionUser } from '@/features/auth';
import { reportError } from '@/lib/report-error';
import { useAsyncData } from '@/lib/use-async-data';
import {
  RoomControlsContext,
  RoomSessionContext,
  type RoomControls,
  type RoomSessionValue,
} from '../hooks/room-session-context';
import { LOBBY_PATH } from '../paths';
import { logAndRethrow } from '../services/report-room-failure';
import { openRoomChannel, type RoomChannel } from '../services/room-channel';
import { getRoomsService } from '../services/rooms-service';
import type { Membership, Room, RoomMember } from '../types';

const NOBODY_ONLINE: ReadonlySet<string> = new Set();
const NO_MEMBERS: readonly RoomMember[] = [];

export type RoomSessionProviderProps = {
  room: Room;
  membership: Membership;
  user: SessionUser;
  children: ReactNode;
};

/** Abre o canal em tempo real da mesa e entrega `useRoomSession()` para tudo dentro da sala. */
export function RoomSessionProvider({
  room: initialRoom,
  membership: initialMembership,
  user,
  children,
}: RoomSessionProviderProps) {
  const roomId = initialRoom.id;
  const [room, setRoom] = useState(initialRoom);
  const [onlineUserIds, setOnlineUserIds] = useState(NOBODY_ONLINE);
  const [deleted, setDeleted] = useState(false);
  const channelRef = useRef<RoomChannel | null>(null);
  const membersState = useAsyncData(`members:${roomId}`, () =>
    getRoomsService().listMembers(roomId).catch(logAndRethrow('list-members')),
  );
  const reloadMembers = membersState.reload;

  useEffect(() => {
    let warned = false;
    const channel = openRoomChannel({
      roomId,
      userId: user.id,
      nickname: initialMembership.nickname,
      handlers: {
        onOnlineChange: setOnlineUserIds,
        onMembersChanged: reloadMembers,
        onRoomUpdated: setRoom,
        onRoomDeleted: () => setDeleted(true),
        onConnectionProblem: (error) => {
          // O cliente do Supabase reconecta sozinho; um aviso por visita basta.
          if (warned) return;
          warned = true;
          reportError(error, {
            userMessage: 'A conexão em tempo real da mesa falhou.',
            hint: 'Tentando reconectar. Se a lista de quem está online parar, recarregue a página.',
            context: { feature: 'rooms', action: 'realtime' },
            severity: 'warn',
          });
        },
      },
    });
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [roomId, user.id, initialMembership.nickname, reloadMembers]);

  const members = membersState.status === 'ready' ? membersState.data : NO_MEMBERS;
  const self = members.find((member) => member.userId === user.id);
  const role = self?.role ?? initialMembership.role;
  const nickname = self?.nickname ?? initialMembership.nickname;

  const value = useMemo<RoomSessionValue>(() => {
    const viewer: Viewer = { userId: user.id, role, isGuest: user.isAnonymous };
    return {
      room,
      membership: { role, nickname },
      isGameMaster: isGameMaster(viewer),
      members,
      onlineUserIds,
      viewer,
    };
  }, [room, role, nickname, members, onlineUserIds, user.id, user.isAnonymous]);

  const controls = useMemo<RoomControls>(
    () => ({
      membersState,
      reloadMembers,
      replaceRoom: setRoom,
      announce: async (event) => {
        await channelRef.current?.announce(event);
      },
    }),
    [membersState, reloadMembers],
  );

  if (deleted) {
    return (
      <main className="page page--center">
        <EmptyState
          icon={<DoorClosed size={22} />}
          title="Esta mesa foi apagada"
          description="O mestre apagou a mesa. Peça um link novo se a aventura continuar em outra."
          action={<ButtonLink to={LOBBY_PATH}>Voltar ao início</ButtonLink>}
        />
      </main>
    );
  }

  return (
    <RoomSessionContext.Provider value={value}>
      <RoomControlsContext.Provider value={controls}>{children}</RoomControlsContext.Provider>
    </RoomSessionContext.Provider>
  );
}
