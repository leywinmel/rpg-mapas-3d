import type { AppSupabaseClient } from '@/lib/supabase';
import { openRoomChannel, roomChannelName } from './room-channel';

type Binding = { type: string; filter: unknown; callback: (payload?: unknown) => void };
type StatusCallback = (status: string, error?: Error) => void;

/** Canal falso: guarda os ouvintes na ordem em que entram e deixa o teste disparar cada um. */
function fakeRealtime(presenceState: Record<string, unknown> = {}) {
  const bindings: Binding[] = [];
  const order: string[] = [];
  const tracked: unknown[] = [];
  let reportStatus: StatusCallback | null = null;

  const channel = {
    on: (type: string, filter: unknown, callback: Binding['callback']) => {
      order.push(`on:${type}`);
      bindings.push({ type, filter, callback });
      return channel;
    },
    subscribe: (callback: StatusCallback) => {
      order.push('subscribe');
      reportStatus = callback;
      return channel;
    },
    track: async (payload: unknown) => {
      tracked.push(payload);
      return 'ok';
    },
    presenceState: () => presenceState,
  };
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
  };
  return {
    client: client as unknown as AppSupabaseClient,
    clientMock: client,
    bindings,
    order,
    tracked,
    status: (status: string, error?: Error) => reportStatus?.(status, error),
    /** Dispara o ouvinte do banco para o evento e a tabela pedidos. */
    fireDatabase: (event: string, table: string, payload?: unknown) => {
      const binding = bindings.find((candidate) => {
        const filter = candidate.filter as { event?: string; table?: string };
        return (
          candidate.type === 'postgres_changes' && filter.event === event && filter.table === table
        );
      });
      if (!binding) throw new Error(`Sem ouvinte para ${event} em ${table}`);
      binding.callback(payload);
    },
  };
}

function handlers() {
  return {
    onOnlineChange: vi.fn<(userIds: ReadonlySet<string>) => void>(),
    onMembersChanged: vi.fn<() => void>(),
    onRoomUpdated: vi.fn<(room: unknown) => void>(),
    onRoomDeleted: vi.fn<() => void>(),
    onConnectionProblem: vi.fn<(error: unknown) => void>(),
  };
}

let nextRoom = 0;
function roomId(): string {
  nextRoom += 1;
  return `00000000-0000-4000-8000-${String(nextRoom).padStart(12, '0')}`;
}

function open(fake: ReturnType<typeof fakeRealtime>, channelHandlers = handlers(), id = roomId()) {
  const channel = openRoomChannel(
    { roomId: id, userId: 'user-1', nickname: 'Ana', handlers: channelHandlers },
    fake.client,
  );
  return { channel, id, channelHandlers };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('openRoomChannel', () => {
  it('shouldOpenAPrivateChannelNamedAfterTheRoomWithPresenceKeyedByUser', () => {
    const fake = fakeRealtime();
    const { channel, id } = open(fake);
    channel.close();
    expect(roomChannelName(id)).toBe(`room:${id}`);
    expect(fake.clientMock.channel).toHaveBeenCalledWith(`room:${id}`, {
      config: { private: true, presence: { key: 'user-1' } },
    });
  });

  it('shouldListenToEveryDatabaseChangeOfTheRoomBeforeSubscribing', () => {
    const fake = fakeRealtime();
    const { channel, id } = open(fake);
    channel.close();
    // Adicionar ouvintes depois do subscribe() quebra o canal no Realtime.
    expect(fake.order.at(-1)).toBe('subscribe');
    expect(fake.order.filter((step) => step === 'subscribe')).toHaveLength(1);

    const databaseFilters = fake.bindings
      .filter((binding) => binding.type === 'postgres_changes')
      .map((binding) => binding.filter);
    const membersFilter = `room_id=eq.${id}`;
    expect(databaseFilters).toEqual([
      { event: 'INSERT', schema: 'public', table: 'room_members', filter: membersFilter },
      { event: 'UPDATE', schema: 'public', table: 'room_members', filter: membersFilter },
      { event: 'DELETE', schema: 'public', table: 'room_members', filter: membersFilter },
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` },
      { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` },
    ]);
  });

  it.each(['INSERT', 'UPDATE', 'DELETE'])('shouldReloadTheMembersOnMemberEvent%s', (event) => {
    const fake = fakeRealtime();
    const { channelHandlers } = open(fake);
    fake.fireDatabase(event, 'room_members');
    expect(channelHandlers.onMembersChanged).toHaveBeenCalledTimes(1);
  });

  it('shouldTellWhenTheRoomIsDeletedStraightFromTheDatabase', () => {
    const fake = fakeRealtime();
    const { channelHandlers } = open(fake);
    fake.fireDatabase('DELETE', 'rooms');
    expect(channelHandlers.onRoomDeleted).toHaveBeenCalledTimes(1);
  });

  it('shouldPassTheUpdatedRoomToTheHandler', () => {
    const fake = fakeRealtime();
    const { channelHandlers, id } = open(fake);
    fake.fireDatabase('UPDATE', 'rooms', {
      new: {
        id,
        slug: 'abc',
        name: 'Cripta',
        owner_id: 'gm-1',
        active_map_id: null,
        created_at: '2026-11-03T00:00:00Z',
      },
    });
    expect(channelHandlers.onRoomUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id, name: 'Cripta' }),
    );
  });

  it('shouldReportWhoIsOnlineFromThePresenceSync', () => {
    const fake = fakeRealtime({ 'user-1': [{}], 'user-2': [{}] });
    const { channelHandlers } = open(fake);
    const presence = fake.bindings.find((binding) => binding.type === 'presence');
    presence?.callback();
    expect(channelHandlers.onOnlineChange).toHaveBeenCalledWith(new Set(['user-1', 'user-2']));
  });

  it('shouldTrackThePresenceOnceSubscribed', () => {
    const fake = fakeRealtime();
    open(fake);
    fake.status('SUBSCRIBED');
    expect(fake.tracked).toEqual([{ userId: 'user-1', nickname: 'Ana' }]);
  });

  it('shouldReportConnectionProblems', () => {
    const fake = fakeRealtime();
    const { channelHandlers } = open(fake);
    const cause = new Error('caiu');
    fake.status('CHANNEL_ERROR', cause);
    fake.status('TIMED_OUT');
    expect(channelHandlers.onConnectionProblem).toHaveBeenNthCalledWith(1, cause);
    expect(channelHandlers.onConnectionProblem).toHaveBeenNthCalledWith(2, expect.any(Error));
    fake.status('CLOSED');
    expect(channelHandlers.onConnectionProblem).toHaveBeenCalledTimes(2);
  });

  it('shouldKeepTheSameChannelWhenReopenedRightAfterClosing', () => {
    const fake = fakeRealtime();
    const first = open(fake);
    first.channel.close();
    // O modo estrito do React fecha e reabre em seguida.
    const second = open(fake, handlers(), first.id);
    vi.runAllTimers();

    expect(fake.clientMock.channel).toHaveBeenCalledTimes(1);
    expect(fake.clientMock.removeChannel).not.toHaveBeenCalled();
    fake.fireDatabase('DELETE', 'room_members');
    expect(second.channelHandlers.onMembersChanged).toHaveBeenCalledTimes(1);
    expect(first.channelHandlers.onMembersChanged).not.toHaveBeenCalled();
  });

  it('shouldRemoveTheChannelOnceItStaysClosed', () => {
    const fake = fakeRealtime();
    const first = open(fake);
    first.channel.close();
    vi.runAllTimers();
    expect(fake.clientMock.removeChannel).toHaveBeenCalledTimes(1);

    // Reabrir depois disso cria um canal novo.
    open(fake, handlers(), first.id).channel.close();
    vi.runAllTimers();
    expect(fake.clientMock.channel).toHaveBeenCalledTimes(2);
  });
});
