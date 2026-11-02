// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { useToastStore } from '@/components';
import { lastSeenKey, type LastSeenStorage } from '../services/last-seen-storage';
import type { Note } from '../types';
import { useUnreadNotes, type UseUnreadNotesOptions } from './useUnreadNotes';

const USER = 'player-1';
const ROOM = 'room-1';

function note(id: string, createdAt: string, authorId: string | null = 'gm'): Note {
  return {
    id,
    roomId: ROOM,
    authorId,
    title: `Título ${id}`,
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
const NEWER = note('newer', '2026-11-01T13:00:00+00:00');

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: LastSeenStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
  return { storage, data };
}

function setup(overrides: Partial<UseUnreadNotesOptions> = {}, stored?: string) {
  const memory = memoryStorage(stored ? { [lastSeenKey(USER, ROOM)]: stored } : {});
  const initialProps: UseUnreadNotesOptions = {
    userId: USER,
    roomId: ROOM,
    panelOpen: false,
    storage: memory.storage,
    ...overrides,
  };
  const hook = renderHook((props: UseUnreadNotesOptions) => useUnreadNotes(props), {
    initialProps,
  });
  const load = (previous: Note[] | null, next: Note[]) =>
    act(() => hook.result.current.handleLoaded({ previous, next }));
  return { ...hook, load, data: memory.data, props: initialProps };
}

const toasts = () => useToastStore.getState().toasts;
const savedValue = (data: Map<string, string>) => data.get(lastSeenKey(USER, ROOM));

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('useUnreadNotes', () => {
  it('shouldTreatWhatIsThereOnTheFirstVisitAsReadAndRememberIt', () => {
    const { result, load, data } = setup();
    load(null, [NEW, MID]);
    expect(result.current.lastSeenAt).toBe(NEW.createdAt);
    expect(savedValue(data)).toBe(NEW.createdAt);
    expect(toasts()).toHaveLength(0);
  });

  it('shouldKeepTheSavedLastSeenSoWhatWasMissedCountsAsUnreadWithoutAToast', () => {
    const { result, load } = setup({}, MID.createdAt);
    load(null, [NEW, MID, OLD]);
    expect(result.current.lastSeenAt).toBe(MID.createdAt);
    expect(toasts()).toHaveLength(0);
  });

  it('shouldWarnWithTheTitleOfANoteThatArrivesWhileThePanelIsClosed', () => {
    const { result, load } = setup();
    load(null, [MID]);
    load([MID], [NEW, MID]);
    expect(toasts()).toEqual([
      expect.objectContaining({ tone: 'info', title: 'Nova anotação', description: NEW.title }),
    ]);
    // O aviso não marca como lida: o contador do botão continua mostrando.
    expect(result.current.lastSeenAt).toBe(MID.createdAt);
  });

  it('shouldSummarizeSeveralArrivalsInOneWarning', () => {
    const { load } = setup();
    load(null, [MID]);
    load([MID], [NEWER, NEW, MID]);
    expect(toasts()).toEqual([expect.objectContaining({ title: '2 anotações novas' })]);
  });

  it('shouldNotWarnAboutTheViewersOwnNotes', () => {
    const { load } = setup();
    load(null, [MID]);
    load([MID], [note('own', NEW.createdAt, USER), MID]);
    expect(toasts()).toHaveLength(0);
  });

  it('shouldNotWarnAboutOlderNotesBroughtInByTheWindowGrowing', () => {
    const { load } = setup();
    load(null, [NEW, MID]);
    load([NEW, MID], [NEW, MID, OLD]);
    expect(toasts()).toHaveLength(0);
  });

  it('shouldShowANoteThatArrivesWithThePanelOpenAsAlreadyReadAndWithoutAWarning', () => {
    const { result, load } = setup({ panelOpen: true });
    load(null, [MID]);
    load([MID], [NEW, MID]);
    expect(toasts()).toHaveLength(0);
    expect(result.current.lastSeenAt).toBe(NEW.createdAt);
  });

  it('shouldMarkEverythingAsReadWhenThePanelOpens', () => {
    const { result, rerender, load, data, props } = setup({}, OLD.createdAt);
    load(null, [NEW, MID, OLD]);
    expect(result.current.lastSeenAt).toBe(OLD.createdAt);

    rerender({ ...props, panelOpen: true });
    expect(result.current.lastSeenAt).toBe(NEW.createdAt);
    expect(savedValue(data)).toBe(NEW.createdAt);
  });

  it('shouldWarnAgainOnceThePanelIsClosedAgain', () => {
    const { rerender, load, props } = setup({ panelOpen: true });
    load(null, [MID]);
    rerender({ ...props, panelOpen: false });
    load([MID], [NEW, MID]);
    expect(toasts()).toHaveLength(1);
  });

  it('shouldKeepCountingDuringTheSessionWhenThereIsNoStorage', () => {
    const { result, load } = setup({ storage: null });
    load(null, [MID]);
    expect(result.current.lastSeenAt).toBe(MID.createdAt);
    load([MID], [NEW, MID]);
    expect(toasts()).toHaveLength(1);
    expect(result.current.lastSeenAt).toBe(MID.createdAt);
  });

  it('shouldCountEveryFirstArrivalWhenTheTableHadNoNotes', () => {
    const { result, load } = setup();
    load(null, []);
    expect(result.current.lastSeenAt).toBeNull();
    load([], [NEW]);
    expect(toasts()).toHaveLength(1);
  });
});
