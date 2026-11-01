import type { AppSupabaseClient } from '@/lib/supabase';
import { setLogSink, type LogEntry } from '@/lib/logger';
import { DICE_EVENTS } from '../constants';
import { createThrowSpec } from '../physics/spec';
import { seededRandom } from '../testing/seeded-random';
import { diceChannelName, openDiceChannel, type DiceChannelHandlers } from './dice-channel';

type Listener = (payload: unknown) => void;

/**
 * Cliente falso: guarda o que o canal assinou (broadcast e postgres_changes) para o teste
 * "emitir" eventos, e o callback de status para simular conexão e queda.
 */
function fakeRealtime() {
  const listeners = new Map<string, Listener>();
  let onStatus: ((status: string, error?: Error) => void) | null = null;
  const channel = {
    on: vi.fn((type: string, filter: { event: string }, callback: Listener) => {
      listeners.set(`${type}:${filter.event}`, callback);
      return channel;
    }),
    subscribe: vi.fn((callback: (status: string, error?: Error) => void) => {
      onStatus = callback;
      return channel;
    }),
    send: vi.fn().mockResolvedValue('ok'),
  };
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn().mockResolvedValue('ok'),
  };
  return {
    client: client as unknown as AppSupabaseClient,
    raw: client,
    channel,
    emit: (key: string, payload: unknown) => listeners.get(key)?.(payload),
    status: (status: string, error?: Error) => onStatus?.(status, error),
  };
}

function handlersSpy(): DiceChannelHandlers {
  return {
    onThrow: vi.fn(),
    onRollInserted: vi.fn(),
    onHistoryCleared: vi.fn(),
    onConnected: vi.fn(),
    onConnectionProblem: vi.fn(),
  };
}

const ROOM = '33333333-3333-4333-8333-333333333333';
const ROLL_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function throwMessage() {
  return {
    rollId: ROLL_ID,
    notation: '2d20kh1 + 3',
    spec: createThrowSpec([20, 20], seededRandom(5)),
  };
}

const ROW = {
  id: ROLL_ID,
  room_id: ROOM,
  roller_id: 'user-1',
  notation: '2d20kh1 + 3',
  results: [
    { sides: 20, value: 4 },
    { sides: 20, value: 17 },
  ],
  modifier: 3,
  total: 20,
  hidden: false,
  created_at: '2026-11-01T12:00:00Z',
};

describe('openDiceChannel', () => {
  const logs: LogEntry[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    logs.length = 0;
    setLogSink((entry) => logs.push(entry));
  });

  afterEach(() => {
    // O módulo guarda os canais abertos: fechar de verdade para o próximo teste partir do zero.
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('shouldNameTheChannelAfterTheRoomAndMakeItPrivate', () => {
    const { client, raw } = fakeRealtime();
    const { close } = openDiceChannel({ roomId: ROOM, handlers: handlersSpy() }, client);
    expect(diceChannelName(ROOM)).toBe(`dice:${ROOM}`);
    expect(raw.channel).toHaveBeenCalledWith(`dice:${ROOM}`, { config: { private: true } });
    close();
  });

  it('shouldHandThrowsToTheHandlerAfterCheckingThem', () => {
    const rt = fakeRealtime();
    const handlers = handlersSpy();
    const { close } = openDiceChannel({ roomId: ROOM, handlers }, rt.client);

    const message = throwMessage();
    rt.emit(`broadcast:${DICE_EVENTS.throw}`, { payload: message });
    expect(handlers.onThrow).toHaveBeenCalledWith(message);
    close();
  });

  it.each([
    ['sem nada', undefined],
    ['com texto', 'oi'],
    ['sem arremesso', { rollId: ROLL_ID, notation: '1d6' }],
    ['com id inválido', { ...throwMessage(), rollId: 'abc' }],
    ['com dados demais', { ...throwMessage(), spec: { dice: [] } }],
  ])('shouldIgnoreAThrowMessage %s', (_, payload) => {
    const rt = fakeRealtime();
    const handlers = handlersSpy();
    const { close } = openDiceChannel({ roomId: ROOM, handlers }, rt.client);

    rt.emit(`broadcast:${DICE_EVENTS.throw}`, { payload });
    expect(handlers.onThrow).not.toHaveBeenCalled();
    expect(logs.some((entry) => entry.level === 'warn')).toBe(true);
    close();
  });

  it('shouldTurnDatabaseInsertsIntoRolls', () => {
    const rt = fakeRealtime();
    const handlers = handlersSpy();
    const { close } = openDiceChannel({ roomId: ROOM, handlers }, rt.client);

    rt.emit('postgres_changes:INSERT', { new: ROW });
    expect(handlers.onRollInserted).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ROLL_ID,
        total: 20,
        dice: [
          { sides: 20, value: 4, kept: false },
          { sides: 20, value: 17, kept: true },
        ],
      }),
    );
    close();
  });

  it('shouldListenOnlyToRollsOfThisRoom', () => {
    const rt = fakeRealtime();
    const { close } = openDiceChannel({ roomId: ROOM, handlers: handlersSpy() }, rt.client);
    const insert = rt.channel.on.mock.calls.find(([type]) => type === 'postgres_changes');
    expect(insert?.[1]).toEqual({
      event: 'INSERT',
      schema: 'public',
      table: 'dice_rolls',
      filter: `room_id=eq.${ROOM}`,
    });
    close();
  });

  it('shouldWarnWhenTheHistoryWasCleared', () => {
    const rt = fakeRealtime();
    const handlers = handlersSpy();
    const { close } = openDiceChannel({ roomId: ROOM, handlers }, rt.client);
    rt.emit(`broadcast:${DICE_EVENTS.historyCleared}`, { payload: {} });
    expect(handlers.onHistoryCleared).toHaveBeenCalledTimes(1);
    close();
  });

  it('shouldTellWhenItConnectsAndWhenItFails', () => {
    const rt = fakeRealtime();
    const handlers = handlersSpy();
    const { close } = openDiceChannel({ roomId: ROOM, handlers }, rt.client);

    rt.status('SUBSCRIBED');
    expect(handlers.onConnected).toHaveBeenCalledTimes(1);

    const failure = new Error('sem rede');
    rt.status('CHANNEL_ERROR', failure);
    expect(handlers.onConnectionProblem).toHaveBeenCalledWith(failure);
    rt.status('TIMED_OUT');
    expect(handlers.onConnectionProblem).toHaveBeenCalledTimes(2);
    close();
  });

  describe('enviar', () => {
    it('shouldBroadcastTheThrowOnTheRoomChannel', async () => {
      const rt = fakeRealtime();
      const { sendThrow, close } = openDiceChannel(
        { roomId: ROOM, handlers: handlersSpy() },
        rt.client,
      );
      const message = throwMessage();
      await sendThrow(message);
      expect(rt.channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: DICE_EVENTS.throw,
        payload: message,
      });
      close();
    });

    it('shouldBroadcastThatTheHistoryWasCleared', async () => {
      const rt = fakeRealtime();
      const { announceCleared, close } = openDiceChannel(
        { roomId: ROOM, handlers: handlersSpy() },
        rt.client,
      );
      await announceCleared();
      expect(rt.channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: DICE_EVENTS.historyCleared,
        payload: {},
      });
      close();
    });

    it('shouldFailLoudlyWhenTheServerDoesNotTakeTheMessage', async () => {
      const rt = fakeRealtime();
      rt.channel.send.mockResolvedValue('timed out');
      const { sendThrow, close } = openDiceChannel(
        { roomId: ROOM, handlers: handlersSpy() },
        rt.client,
      );
      await expect(sendThrow(throwMessage())).rejects.toThrow(/timed out/);
      close();
    });
  });

  describe('fechar', () => {
    it('shouldRemoveTheChannelAfterAMoment', () => {
      const rt = fakeRealtime();
      const { close } = openDiceChannel({ roomId: ROOM, handlers: handlersSpy() }, rt.client);
      close();
      expect(rt.raw.removeChannel).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(rt.raw.removeChannel).toHaveBeenCalledWith(rt.channel);
    });

    it('shouldReuseTheChannelWhenReactReopensItRightAway', () => {
      // O modo estrito do React fecha e reabre o efeito em seguida.
      const rt = fakeRealtime();
      const first = handlersSpy();
      const second = handlersSpy();

      const opened = openDiceChannel({ roomId: ROOM, handlers: first }, rt.client);
      opened.close();
      const reopened = openDiceChannel({ roomId: ROOM, handlers: second }, rt.client);

      vi.runAllTimers();
      expect(rt.raw.channel).toHaveBeenCalledTimes(1);
      expect(rt.raw.removeChannel).not.toHaveBeenCalled();

      // Os eventos passam a ir para quem reabriu.
      rt.emit(`broadcast:${DICE_EVENTS.historyCleared}`, { payload: {} });
      expect(first.onHistoryCleared).not.toHaveBeenCalled();
      expect(second.onHistoryCleared).toHaveBeenCalledTimes(1);
      reopened.close();
    });
  });
});
