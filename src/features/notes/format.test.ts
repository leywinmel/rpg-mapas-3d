import type { RoomMember } from '@/features/rooms';
import { describeAudience, formatNoteTime, notesButtonLabel } from './format';
import type { Note } from './types';

function member(userId: string, nickname: string): RoomMember {
  return { userId, nickname, role: 'player', joinedAt: '2026-11-01T10:00:00Z' };
}

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    roomId: 'r1',
    authorId: 'gm',
    title: 'Título',
    body: '',
    imagePath: null,
    toAll: true,
    recipientIds: [],
    createdAt: '2026-11-01T18:10:00Z',
    ...overrides,
  };
}

const members = [member('ana', 'Ana'), member('bia', 'Bia')];

describe('describeAudience', () => {
  it('shouldSayTheWholeTableForEveryone', () => {
    expect(describeAudience(note(), { canManage: true, members })).toBe('Para a mesa toda');
    expect(describeAudience(note(), { canManage: false, members })).toBe('Para a mesa toda');
  });

  it('shouldTellAPlayerOnlyThatItIsForThem', () => {
    const secret = note({ toAll: false, recipientIds: ['ana'] });
    expect(describeAudience(secret, { canManage: false, members })).toBe('Só para você');
  });

  it('shouldListTheNicknamesOfTheChosenPlayersForTheGameMaster', () => {
    const secret = note({ toAll: false, recipientIds: ['ana', 'bia'] });
    expect(describeAudience(secret, { canManage: true, members })).toBe('Para Ana e Bia');
  });

  it('shouldMarkRecipientsWhoLeftTheTable', () => {
    const one = note({ toAll: false, recipientIds: ['ana', 'saiu'] });
    expect(describeAudience(one, { canManage: true, members })).toBe(
      'Para Ana e um jogador que saiu da mesa',
    );
    const two = note({ toAll: false, recipientIds: ['x', 'y'] });
    expect(describeAudience(two, { canManage: true, members })).toBe(
      'Para 2 jogadores que saíram da mesa',
    );
  });

  it('shouldNotInventRecipientsWhenThereAreNone', () => {
    expect(describeAudience(note({ toAll: false }), { canManage: true, members })).toBe(
      'Sem destinatários',
    );
  });
});

describe('notesButtonLabel', () => {
  it('shouldPutTheUnreadCountInTheAccessibleName', () => {
    expect(notesButtonLabel(0)).toBe('Anotações');
    expect(notesButtonLabel(1)).toBe('Anotações, 1 nova');
    expect(notesButtonLabel(2)).toBe('Anotações, 2 novas');
  });
});

describe('formatNoteTime', () => {
  it('shouldShowShortDateAndTimeInPortuguese', () => {
    expect(formatNoteTime('2026-11-01T18:10:00Z', 'UTC')).toMatch(/01\/11\/2026.*18:10/);
  });

  it('shouldReturnNothingForAnInvalidDate', () => {
    expect(formatNoteTime('não é data')).toBe('');
  });
});
