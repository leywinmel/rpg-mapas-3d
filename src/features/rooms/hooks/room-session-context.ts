import { createContext, useContext } from 'react';
import type { Viewer } from '@/domain';
import type { AsyncData } from '@/lib/use-async-data';
import type { RoomAnnouncement } from '../services/room-channel';
import type { Membership, Room, RoomMember } from '../types';

/**
 * O que as features da sala (cena, tokens, névoa, dados, anotações) leem da mesa aberta:
 * - room: a mesa, já com o nome atualizado em tempo real.
 * - membership: papel ('gm' | 'player') e apelido de quem está vendo.
 * - isGameMaster: atalho para esconder o que o jogador não pode fazer (o banco decide no fim).
 * - members: todos os membros (vazio enquanto carrega), em ordem de entrada.
 * - onlineUserIds: ids de quem está com a sala aberta agora (presença do Realtime).
 * - viewer: o mesmo que as regras de `@/domain` pedem (canMoveToken etc.).
 */
export type RoomSessionValue = {
  room: Room;
  membership: Membership;
  isGameMaster: boolean;
  members: readonly RoomMember[];
  onlineUserIds: ReadonlySet<string>;
  viewer: Viewer;
};

/** Peças internas do HUD da sala (não exportadas para as outras features). */
export type RoomControls = {
  membersState: AsyncData<RoomMember[]>;
  reloadMembers: () => void;
  announce: (event: RoomAnnouncement) => Promise<void>;
  replaceRoom: (room: Room) => void;
};

export const RoomSessionContext = createContext<RoomSessionValue | null>(null);
export const RoomControlsContext = createContext<RoomControls | null>(null);

/** Dados da mesa aberta. Só funciona dentro da sala (RoomSessionProvider). */
export function useRoomSession(): RoomSessionValue {
  const value = useContext(RoomSessionContext);
  if (!value) throw new Error('useRoomSession precisa estar dentro de RoomSessionProvider.');
  return value;
}

export function useRoomControls(): RoomControls {
  const value = useContext(RoomControlsContext);
  if (!value) throw new Error('useRoomControls precisa estar dentro de RoomSessionProvider.');
  return value;
}
