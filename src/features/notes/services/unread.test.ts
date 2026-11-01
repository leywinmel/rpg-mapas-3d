import type { Note } from '../types';
import { countUnread, findArrivals, isUnread, laterOf, newestCreatedAt } from './unread';

const ME = 'player-me';

function note(id: string, createdAt: string, authorId: string | null = 'gm'): Note {
  return {
    id,
    roomId: 'room',
    authorId,
    title: id,
    body: '',
    imagePath: null,
    toAll: true,
    recipientIds: [],
    createdAt,
  };
}

const OLD = note('old', '2026-11-01T10:00:00+00:00');
const MID = note('mid', '2026-11-01T11:00:00+00:00');
const NEW = note('new', '2026-11-01T12:00:00+00:00');

describe('newestCreatedAt and laterOf', () => {
  it('shouldFindTheNewestMomentRegardlessOfOrder', () => {
    expect(newestCreatedAt([OLD, NEW, MID])).toBe(NEW.createdAt);
    expect(newestCreatedAt([])).toBeNull();
  });

  it('shouldCompareMomentsAndTreatNullAsNever', () => {
    expect(laterOf(null, null)).toBeNull();
    expect(laterOf(null, OLD.createdAt)).toBe(OLD.createdAt);
    expect(laterOf(NEW.createdAt, null)).toBe(NEW.createdAt);
    expect(laterOf(NEW.createdAt, OLD.createdAt)).toBe(NEW.createdAt);
    expect(laterOf(OLD.createdAt, NEW.createdAt)).toBe(NEW.createdAt);
  });

  it('shouldCompareRealMomentsNotTextWhenOffsetsDiffer', () => {
    // 12:00-03:00 é 15:00 UTC: mais tarde que 13:00 UTC, embora o texto "diga" o contrário.
    expect(laterOf('2026-11-01T13:00:00+00:00', '2026-11-01T12:00:00-03:00')).toBe(
      '2026-11-01T12:00:00-03:00',
    );
  });
});

describe('isUnread and countUnread', () => {
  it('shouldCountOnlyOthersNotesNewerThanTheLastSeen', () => {
    expect(countUnread([NEW, MID, OLD], ME, MID.createdAt)).toBe(1);
    expect(isUnread(NEW, ME, MID.createdAt)).toBe(true);
    expect(isUnread(MID, ME, MID.createdAt)).toBe(false);
  });

  it('shouldNeverCountTheViewersOwnNotes', () => {
    const own = note('own', '2026-11-01T13:00:00+00:00', ME);
    expect(countUnread([own, NEW], ME, OLD.createdAt)).toBe(1);
  });

  it('shouldCountEverythingWhenNothingWasSeenYet', () => {
    expect(countUnread([NEW, MID, OLD], ME, null)).toBe(3);
  });

  it('shouldCountNotesWhoseAuthorAccountIsGone', () => {
    expect(isUnread(note('orphan', NEW.createdAt, null), ME, OLD.createdAt)).toBe(true);
  });
});

describe('findArrivals', () => {
  it('shouldFindNothingOnTheFirstLoad', () => {
    expect(findArrivals(null, [NEW, MID], ME)).toEqual([]);
  });

  it('shouldFindNotesNewerThanEverythingAlreadyKnown', () => {
    expect(findArrivals([MID, OLD], [NEW, MID, OLD], ME)).toEqual([NEW]);
  });

  it('shouldIgnoreTheViewersOwnNotes', () => {
    const own = note('own', '2026-11-01T13:00:00+00:00', ME);
    expect(findArrivals([MID], [own, MID], ME)).toEqual([]);
  });

  it('shouldIgnoreOlderNotesThatJustEnteredTheWindow', () => {
    // "Ver mais antigas" ou a exclusão de uma nota nova puxam notas velhas para dentro da lista.
    expect(findArrivals([NEW, MID], [NEW, MID, OLD], ME)).toEqual([]);
    expect(findArrivals([NEW, MID], [MID, OLD], ME)).toEqual([]);
  });

  it('shouldTreatEveryoneElsesNoteAsAnArrivalWhenTheListWasEmpty', () => {
    expect(findArrivals([], [NEW, OLD], ME)).toEqual([NEW, OLD]);
  });

  it('shouldNotAnnounceANoteThatWasOnlyEdited', () => {
    expect(findArrivals([NEW], [{ ...NEW, title: 'editada' }], ME)).toEqual([]);
  });
});
