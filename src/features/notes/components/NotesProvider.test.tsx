// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { useToastStore } from '@/components';
import type { RoomMember, RoomSessionValue } from '@/features/rooms';
import { setLogSink, type LogEntry } from '@/lib/logger';
import { NOTES_PAGE_SIZE, NOTES_RELOAD_DELAY_MS } from '../constants';
import { useNotes, type NotesContextValue } from '../hooks/notes-context';
import type { LastSeenStorage } from '../services/last-seen-storage';
import { NoteError } from '../services/note-errors';
import type {
  NotesChannelHandlers,
  NotesChannelOptions,
  openNotesChannel,
} from '../services/notes-channel';
import type { NotesService } from '../services/notes-service';
import type { Note, NoteDraft } from '../types';
import { NotesProvider } from './NotesProvider';

// A sala é de outra feature: aqui só importa o que ela entrega às anotações.
const session = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock('@/features/rooms', () => ({ useRoomSession: () => session.current }));

const ROOM_ID = '33333333-3333-4333-8333-333333333333';
const GM_ID = '11111111-1111-4111-8111-111111111111';
const ANA_ID = '22222222-2222-4222-8222-222222222222';

function member(userId: string, nickname: string, role: 'gm' | 'player'): RoomMember {
  return { userId, nickname, role, joinedAt: '2026-11-01T10:00:00Z' };
}

function sessionAs(role: 'gm' | 'player'): RoomSessionValue {
  const userId = role === 'gm' ? GM_ID : ANA_ID;
  return {
    room: { id: ROOM_ID, slug: 'demo', name: 'Mesa', ownerId: GM_ID, activeMapId: null },
    membership: { role, nickname: role === 'gm' ? 'Mestre' : 'Ana' },
    isGameMaster: role === 'gm',
    members: [member(GM_ID, 'Mestre', 'gm'), member(ANA_ID, 'Ana', 'player')],
    onlineUserIds: new Set(),
    viewer: { userId, role, isGuest: false },
  };
}

function note(id: string, createdAt: string, authorId: string | null = GM_ID): Note {
  return {
    id,
    roomId: ROOM_ID,
    authorId,
    title: `Título ${id}`,
    body: '',
    imagePath: null,
    toAll: true,
    recipientIds: [],
    createdAt,
  };
}

const FIRST = note('first', '2026-11-01T10:00:00+00:00');
const SECOND = note('second', '2026-11-01T11:00:00+00:00');
const THIRD = note('third', '2026-11-01T12:00:00+00:00');

/** Serviço falso: devolve a lista "do servidor" (que o teste muda) na janela pedida. */
function fakeService(initial: Note[]) {
  const server = { notes: initial };
  const service = {
    listNotes: vi.fn(async ({ limit }: { roomId: string; limit: number }) => ({
      notes: server.notes.slice(0, limit),
      hasMore: server.notes.length > limit,
    })),
    sendNote: vi.fn(async () => FIRST),
    updateNote: vi.fn(async () => undefined),
    deleteNote: vi.fn(async () => undefined),
    getImageUrl: vi.fn(async (path: string) => `https://files.test/${path}`),
  };
  return { server, service, asService: service as unknown as NotesService };
}

function fakeChannel() {
  let handlers: NotesChannelHandlers | null = null;
  const channel = { announce: vi.fn(async () => undefined), close: vi.fn() };
  const open = vi.fn((options: NotesChannelOptions) => {
    handlers = options.handlers;
    return channel;
  });
  return {
    channel,
    open,
    asOpen: open as unknown as typeof openNotesChannel,
    signal: () => handlers?.onSignal(),
    problem: (error: unknown) => handlers?.onConnectionProblem(error),
  };
}

function memoryStorage(): LastSeenStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

const holder: { value: NotesContextValue | null } = { value: null };

/** O contexto como o último render o entregou. */
function current(): NotesContextValue {
  if (!holder.value) throw new Error('Probe ainda não renderizou.');
  return holder.value;
}

function Probe() {
  const notes = useNotes();
  useEffect(() => {
    holder.value = notes;
  });
  const { feed, unreadCount, canManage } = notes;
  return (
    <>
      <p data-testid="status">{feed.status}</p>
      <p data-testid="count">{feed.status === 'ready' ? feed.notes.length : '-'}</p>
      <p data-testid="more">{feed.status === 'ready' ? String(feed.hasMore) : '-'}</p>
      <p data-testid="unread">{unreadCount}</p>
      <p data-testid="manage">{String(canManage)}</p>
    </>
  );
}

type RenderOptions = {
  role?: 'gm' | 'player';
  notes?: Note[];
  panelOpen?: boolean;
};

function renderProvider({
  role = 'player',
  notes = [SECOND, FIRST],
  panelOpen = false,
}: RenderOptions = {}) {
  session.current = sessionAs(role);
  const fake = fakeService(notes);
  const channel = fakeChannel();
  const dependencies = {
    service: fake.asService,
    openChannel: channel.asOpen,
    storage: memoryStorage(),
  };
  const tree = (open: boolean) => (
    <NotesProvider panelOpen={open} dependencies={dependencies}>
      <Probe />
    </NotesProvider>
  );
  const view = render(tree(panelOpen));
  return { ...fake, ...channel, rerenderWith: (open: boolean) => view.rerender(tree(open)), view };
}

const text = (id: string) => screen.getByTestId(id).textContent;
const toasts = () => useToastStore.getState().toasts;

async function untilReady() {
  await waitFor(() => expect(text('status')).toBe('ready'));
}

/** Entrega os sinais com o relógio falso e espera a recarga que eles provocam. */
async function signalAndWait(signal: () => void, times = 1) {
  vi.useFakeTimers();
  try {
    act(() => {
      for (let index = 0; index < times; index += 1) signal();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NOTES_RELOAD_DELAY_MS);
    });
  } finally {
    vi.useRealTimers();
  }
}

const DRAFT: NoteDraft = {
  title: 'Novo',
  body: 'Texto',
  image: null,
  recipients: { mode: 'all' },
};

beforeAll(() => {
  // Falhas esperadas vão para o log; aqui o ruído não ajuda.
  setLogSink(() => undefined);
});

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NotesProvider', () => {
  it('shouldLoadTheFirstWindowAndStartWithNothingUnread', async () => {
    const { service } = renderProvider();
    expect(text('status')).toBe('loading');
    await untilReady();
    expect(service.listNotes).toHaveBeenCalledWith({ roomId: ROOM_ID, limit: NOTES_PAGE_SIZE });
    expect(text('count')).toBe('2');
    expect(text('unread')).toBe('0');
    expect(toasts()).toHaveLength(0);
  });

  it('shouldLetOnlyTheGameMasterManageNotes', async () => {
    renderProvider({ role: 'gm' });
    await untilReady();
    expect(text('manage')).toBe('true');
  });

  it('shouldNotLetAPlayerManageNotes', async () => {
    renderProvider({ role: 'player' });
    await untilReady();
    expect(text('manage')).toBe('false');
  });

  it('shouldListenToTheRoomChannelAndCloseItOnUnmount', async () => {
    const { open, channel, view } = renderProvider();
    await untilReady();
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ roomId: ROOM_ID }));
    view.unmount();
    expect(channel.close).toHaveBeenCalled();
  });

  it('shouldReloadOnlyOnceForSignalsInsideTheInterval', async () => {
    const { service, signal } = renderProvider();
    await untilReady();
    expect(service.listNotes).toHaveBeenCalledTimes(1);

    await signalAndWait(signal, 3);
    expect(service.listNotes).toHaveBeenCalledTimes(2);
  });

  it('shouldWarnAndCountANoteThatArrivesWhileThePanelIsClosed', async () => {
    const { server, signal } = renderProvider();
    await untilReady();

    server.notes = [THIRD, SECOND, FIRST];
    await signalAndWait(signal);

    expect(text('count')).toBe('3');
    expect(text('unread')).toBe('1');
    expect(toasts()).toEqual([
      expect.objectContaining({ title: 'Nova anotação', description: THIRD.title }),
    ]);
  });

  it('shouldMarkEverythingAsReadWhenThePanelOpens', async () => {
    const { server, signal, rerenderWith } = renderProvider();
    await untilReady();
    server.notes = [THIRD, SECOND, FIRST];
    await signalAndWait(signal);
    expect(text('unread')).toBe('1');

    rerenderWith(true);
    await waitFor(() => expect(text('unread')).toBe('0'));
  });

  it('shouldShowANoteThatArrivesWithThePanelOpenAsReadWithoutAWarning', async () => {
    const { server, signal } = renderProvider({ panelOpen: true });
    await untilReady();

    server.notes = [THIRD, SECOND, FIRST];
    await signalAndWait(signal);

    expect(text('count')).toBe('3');
    expect(text('unread')).toBe('0');
    expect(toasts()).toHaveLength(0);
  });

  it('shouldNotCountOrWarnAboutTheViewersOwnNotes', async () => {
    const { server, signal } = renderProvider({ role: 'gm' });
    await untilReady();

    server.notes = [note('mine', '2026-11-01T13:00:00+00:00', GM_ID), SECOND, FIRST];
    await signalAndWait(signal);

    expect(text('count')).toBe('3');
    expect(text('unread')).toBe('0');
    expect(toasts()).toHaveLength(0);
  });

  it('shouldGrowTheWindowWhenAskingForOlderNotes', async () => {
    const { service } = renderProvider();
    await untilReady();

    await act(async () => current().loadMore());
    await waitFor(() =>
      expect(service.listNotes).toHaveBeenLastCalledWith({
        roomId: ROOM_ID,
        limit: NOTES_PAGE_SIZE * 2,
      }),
    );
    await waitFor(() => expect(current().loadingMore).toBe(false));
  });

  it('shouldReportThereAreOlderNotesWhenTheWindowIsFull', async () => {
    const many = Array.from({ length: NOTES_PAGE_SIZE + 1 }, (_, index) =>
      note(`n${index}`, `2026-11-01T${String(10 + (index % 10)).padStart(2, '0')}:00:00+00:00`),
    );
    renderProvider({ notes: many });
    await untilReady();
    expect(text('count')).toBe(String(NOTES_PAGE_SIZE));
    expect(text('more')).toBe('true');
  });

  it('shouldKeepTheListAndWarnWhenAReloadFails', async () => {
    const { service, signal } = renderProvider();
    await untilReady();

    service.listNotes.mockRejectedValueOnce(new Error('Failed to fetch'));
    await signalAndWait(signal);

    expect(text('status')).toBe('ready');
    expect(text('count')).toBe('2');
    expect(toasts()).toEqual([expect.objectContaining({ tone: 'warning' })]);
  });

  it('shouldShowAnErrorWhenTheFirstLoadFailsAndRecoverOnRetry', async () => {
    session.current = sessionAs('player');
    const fake = fakeService([SECOND, FIRST]);
    fake.service.listNotes.mockRejectedValueOnce(new Error('Failed to fetch'));
    const channel = fakeChannel();
    render(
      <NotesProvider
        panelOpen={false}
        dependencies={{
          service: fake.asService,
          openChannel: channel.asOpen,
          storage: memoryStorage(),
        }}
      >
        <Probe />
      </NotesProvider>,
    );

    await waitFor(() => expect(text('status')).toBe('error'));
    act(() => current().reload());
    expect(text('status')).toBe('loading');
    await untilReady();
    expect(text('count')).toBe('2');
  });

  it('shouldRefreshTheListAndWarnTheOthersAfterSending', async () => {
    const { service, channel } = renderProvider({ role: 'gm' });
    await untilReady();

    await act(async () => current().sendNote(DRAFT));

    expect(service.sendNote).toHaveBeenCalledWith({ roomId: ROOM_ID, ...DRAFT });
    expect(channel.announce).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(service.listNotes).toHaveBeenCalledTimes(2));
  });

  it('shouldRefreshAndWarnTheOthersAfterEditingAndDeleting', async () => {
    const { service, channel } = renderProvider({ role: 'gm' });
    await untilReady();

    await act(async () => current().updateNote({ noteId: FIRST.id, title: 'x', body: '' }));
    await act(async () => current().deleteNote(FIRST));

    expect(service.updateNote).toHaveBeenCalledWith({ noteId: FIRST.id, title: 'x', body: '' });
    expect(service.deleteNote).toHaveBeenCalledWith(FIRST);
    expect(channel.announce).toHaveBeenCalledTimes(2);
  });

  it('shouldPassTheFailureOnAndSkipTheAnnouncementWhenSendingFails', async () => {
    const { service, channel } = renderProvider({ role: 'gm' });
    await untilReady();
    service.sendNote.mockRejectedValueOnce(new NoteError('forbidden', '42501'));

    await act(async () => {
      await expect(current().sendNote(DRAFT)).rejects.toMatchObject({ kind: 'forbidden' });
    });
    expect(channel.announce).not.toHaveBeenCalled();
    expect(service.listNotes).toHaveBeenCalledTimes(1);
  });

  it('shouldReloadWhenTheNoteIsGoneSoTheStaleCardDisappears', async () => {
    const { service } = renderProvider({ role: 'gm' });
    await untilReady();
    service.deleteNote.mockRejectedValueOnce(new NoteError('not-found', null));

    await act(async () => {
      await expect(current().deleteNote(FIRST)).rejects.toMatchObject({ kind: 'not-found' });
    });
    await waitFor(() => expect(service.listNotes).toHaveBeenCalledTimes(2));
  });

  it('shouldNotFailTheActionWhenOnlyTheAnnouncementFails', async () => {
    const entries: LogEntry[] = [];
    setLogSink((entry) => entries.push(entry));
    const { channel } = renderProvider({ role: 'gm' });
    await untilReady();
    channel.announce.mockRejectedValueOnce(new Error('canal fora'));

    await act(async () => current().sendNote(DRAFT));

    expect(entries.some((entry) => entry.level === 'warn')).toBe(true);
    expect(toasts()).toHaveLength(0);
  });

  it('shouldWarnOnlyOnceAboutConnectionProblems', async () => {
    const { problem } = renderProvider();
    await untilReady();
    act(() => problem(new Error('caiu')));
    act(() => problem(new Error('caiu de novo')));
    expect(toasts()).toHaveLength(1);
  });

  it('shouldExposeTheSigningOfImageUrls', async () => {
    const { service } = renderProvider();
    await untilReady();
    await expect(current().getImageUrl('sala/a.png')).resolves.toBe(
      'https://files.test/sala/a.png',
    );
    expect(service.getImageUrl).toHaveBeenCalledWith('sala/a.png');
  });
});
