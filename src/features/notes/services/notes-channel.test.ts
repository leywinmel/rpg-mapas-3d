import type { AppSupabaseClient } from '@/lib/supabase';
import { NOTES_ANNOUNCEMENT } from '../constants';
import { notesChannelName, openNotesChannel } from './notes-channel';

type Binding = { type: string; filter: unknown; callback: () => void };
type StatusCallback = (status: string, error?: Error) => void;

/** Canal falso: guarda os ouvintes na ordem em que entram e deixa o teste disparar cada um. */
function fakeRealtime(sendResult: 'ok' | 'error' | 'timed out' = 'ok') {
  const bindings: Binding[] = [];
  const order: string[] = [];
  const sent: unknown[] = [];
  let reportStatus: StatusCallback | null = null;

  const channel = {
    on: (type: string, filter: unknown, callback: () => void) => {
      order.push(`on:${type}`);
      bindings.push({ type, filter, callback });
      return channel;
    },
    subscribe: (callback: StatusCallback) => {
      order.push('subscribe');
      reportStatus = callback;
      return channel;
    },
    send: async (message: unknown) => {
      sent.push(message);
      return sendResult;
    },
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
    sent,
    status: (status: string, error?: Error) => reportStatus?.(status, error),
  };
}

function handlers() {
  return {
    onSignal: vi.fn<() => void>(),
    onConnectionProblem: vi.fn<(error: unknown) => void>(),
  };
}

let nextRoom = 0;
function roomId(): string {
  nextRoom += 1;
  return `00000000-0000-4000-8000-${String(nextRoom).padStart(12, '0')}`;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('openNotesChannel', () => {
  it('shouldOpenAPrivateChannelNamedAfterTheRoom', () => {
    const id = roomId();
    const fake = fakeRealtime();
    openNotesChannel({ roomId: id, handlers: handlers() }, fake.client).close();
    expect(notesChannelName(id)).toBe(`notes:${id}`);
    expect(fake.clientMock.channel).toHaveBeenCalledWith(`notes:${id}`, {
      config: { private: true },
    });
  });

  it('shouldListenToInsertsUpdatesAndTheAnnouncementBeforeSubscribing', () => {
    const id = roomId();
    const fake = fakeRealtime();
    openNotesChannel({ roomId: id, handlers: handlers() }, fake.client).close();
    // Adicionar ouvintes depois do subscribe() quebra o canal no Realtime.
    expect(fake.order).toEqual([
      'on:postgres_changes',
      'on:postgres_changes',
      'on:broadcast',
      'subscribe',
    ]);
    expect(fake.bindings.map((binding) => binding.filter)).toEqual([
      { event: 'INSERT', schema: 'public', table: 'notes', filter: `room_id=eq.${id}` },
      { event: 'UPDATE', schema: 'public', table: 'notes', filter: `room_id=eq.${id}` },
      { event: NOTES_ANNOUNCEMENT },
    ]);
  });

  it('shouldSignalOnEveryKindOfNews', () => {
    const fake = fakeRealtime();
    const channelHandlers = handlers();
    openNotesChannel({ roomId: roomId(), handlers: channelHandlers }, fake.client);
    for (const binding of fake.bindings) binding.callback();
    expect(channelHandlers.onSignal).toHaveBeenCalledTimes(3);
  });

  it('shouldSignalWhenTheChannelJoinsOrComesBackFromADrop', () => {
    const fake = fakeRealtime();
    const channelHandlers = handlers();
    openNotesChannel({ roomId: roomId(), handlers: channelHandlers }, fake.client);
    fake.status('SUBSCRIBED');
    fake.status('CHANNEL_ERROR', new Error('caiu'));
    fake.status('SUBSCRIBED');
    expect(channelHandlers.onSignal).toHaveBeenCalledTimes(2);
  });

  it('shouldReportConnectionProblems', () => {
    const fake = fakeRealtime();
    const channelHandlers = handlers();
    openNotesChannel({ roomId: roomId(), handlers: channelHandlers }, fake.client);
    const cause = new Error('caiu');
    fake.status('CHANNEL_ERROR', cause);
    fake.status('TIMED_OUT');
    expect(channelHandlers.onConnectionProblem).toHaveBeenNthCalledWith(1, cause);
    expect(channelHandlers.onConnectionProblem).toHaveBeenNthCalledWith(2, expect.any(Error));
    fake.status('CLOSED');
    expect(channelHandlers.onConnectionProblem).toHaveBeenCalledTimes(2);
  });

  it('shouldKeepTheSameChannelWhenReopenedRightAfterClosing', () => {
    const id = roomId();
    const fake = fakeRealtime();
    const first = handlers();
    const second = handlers();
    openNotesChannel({ roomId: id, handlers: first }, fake.client).close();
    // O modo estrito do React fecha e reabre em seguida.
    openNotesChannel({ roomId: id, handlers: second }, fake.client);
    vi.runAllTimers();

    expect(fake.clientMock.channel).toHaveBeenCalledTimes(1);
    expect(fake.clientMock.removeChannel).not.toHaveBeenCalled();
    fake.bindings[0]?.callback();
    expect(second.onSignal).toHaveBeenCalledTimes(1);
    expect(first.onSignal).not.toHaveBeenCalled();
  });

  it('shouldRemoveTheChannelOnceItStaysClosed', () => {
    const id = roomId();
    const fake = fakeRealtime();
    openNotesChannel({ roomId: id, handlers: handlers() }, fake.client).close();
    vi.runAllTimers();
    expect(fake.clientMock.removeChannel).toHaveBeenCalledTimes(1);

    // Reabrir depois disso cria um canal novo.
    openNotesChannel({ roomId: id, handlers: handlers() }, fake.client).close();
    vi.runAllTimers();
    expect(fake.clientMock.channel).toHaveBeenCalledTimes(2);
  });
});

describe('announce', () => {
  it('shouldBroadcastOnlyTheWarningWithoutAnyContent', async () => {
    const fake = fakeRealtime();
    const channel = openNotesChannel({ roomId: roomId(), handlers: handlers() }, fake.client);
    await channel.announce();
    expect(fake.sent).toEqual([{ type: 'broadcast', event: NOTES_ANNOUNCEMENT, payload: {} }]);
  });

  it('shouldFailWhenTheWarningIsNotDelivered', async () => {
    const fake = fakeRealtime('timed out');
    const channel = openNotesChannel({ roomId: roomId(), handlers: handlers() }, fake.client);
    await expect(channel.announce()).rejects.toThrow(/timed out/);
  });
});
