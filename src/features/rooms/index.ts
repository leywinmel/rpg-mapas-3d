// Mesas (salas): lobby, entrada por link, presença e a sessão da mesa aberta.
//
// Para as próximas fatias (cena, tokens, névoa, dados, anotações), dentro da sala:
//   const { room, membership, isGameMaster, members, onlineUserIds, viewer } = useRoomSession();
// `viewer` é o formato das regras de `@/domain` (ex.: canMoveToken(viewer, token)).
// O RoomSessionProvider já envolve a sala em RoomPage; fora dele o hook lança erro.
export { RoomSessionProvider } from './components/RoomSessionProvider';
export { useRoomSession, type RoomSessionValue } from './hooks/room-session-context';
export { roomChannelName } from './services/room-channel';
export { LOBBY_PATH, roomPath } from './paths';
export type { Membership, Room, RoomMember } from './types';
