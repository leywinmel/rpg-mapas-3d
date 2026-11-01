import type { RoomMember } from '../types';

/** Mestre primeiro, depois quem está online, depois por apelido. */
export function sortMembers(
  members: readonly RoomMember[],
  onlineUserIds: ReadonlySet<string>,
): RoomMember[] {
  const rank = (member: RoomMember) =>
    (member.role === 'gm' ? 0 : 2) + (onlineUserIds.has(member.userId) ? 0 : 1);
  return [...members].sort(
    (a, b) => rank(a) - rank(b) || a.nickname.localeCompare(b.nickname, 'pt-BR'),
  );
}
