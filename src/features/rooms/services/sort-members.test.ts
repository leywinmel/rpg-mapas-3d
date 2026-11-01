import type { RoomMember } from '../types';
import { sortMembers } from './sort-members';

const member = (userId: string, nickname: string, role: RoomMember['role']): RoomMember => ({
  userId,
  nickname,
  role,
  joinedAt: '2026-10-01T00:00:00Z',
});

describe('sortMembers', () => {
  it('shouldPutGameMasterThenOnlinePlayersFirst', () => {
    const members = [
      member('p1', 'Zeca', 'player'),
      member('p2', 'Ana', 'player'),
      member('gm', 'Mestre', 'gm'),
      member('p3', 'Bia', 'player'),
    ];
    const sorted = sortMembers(members, new Set(['p1', 'p3']));
    expect(sorted.map((item) => item.nickname)).toEqual(['Mestre', 'Bia', 'Zeca', 'Ana']);
  });
});
