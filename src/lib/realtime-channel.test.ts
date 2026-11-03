import type { RealtimeChannel } from '@supabase/supabase-js';
import { createChannelRegistry, isChannelFailure, sendBroadcast } from './realtime-channel';
import type { AppSupabaseClient } from './supabase';

type Handlers = { onNews: () => void };

function fakeClient() {
  const channel = { id: 'canal' } as unknown as RealtimeChannel;
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
  };
  return { client: client as unknown as AppSupabaseClient, clientMock: client, channel };
}

const CONFIG = { private: true };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createChannelRegistry', () => {
  it('shouldCreateTheChannelWithTheNameAndConfigAndSetItUpOnce', () => {
    const fake = fakeClient();
    const setup = vi.fn();
    const registry = createChannelRegistry<Handlers>();
    const handlers = { onNews: vi.fn() };
    const { entry } = registry.acquire({
      name: 'sala:1',
      client: fake.client,
      handlers,
      config: CONFIG,
      setup,
    });
    expect(fake.clientMock.channel).toHaveBeenCalledWith('sala:1', { config: CONFIG });
    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(entry);
    expect(entry.handlers).toBe(handlers);
  });

  it('shouldReuseTheChannelAndSwapTheHandlersWhenReopenedRightAfterClosing', () => {
    const fake = fakeClient();
    const setup = vi.fn();
    const registry = createChannelRegistry<Handlers>();
    const first = registry.acquire({
      name: 'sala:2',
      client: fake.client,
      handlers: { onNews: vi.fn() },
      config: CONFIG,
      setup,
    });
    first.close();
    // O modo estrito do React fecha e reabre em seguida.
    const secondHandlers = { onNews: vi.fn() };
    const second = registry.acquire({
      name: 'sala:2',
      client: fake.client,
      handlers: secondHandlers,
      config: CONFIG,
      setup,
    });
    vi.runAllTimers();

    expect(second.entry).toBe(first.entry);
    expect(second.entry.handlers).toBe(secondHandlers);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(fake.clientMock.channel).toHaveBeenCalledTimes(1);
    expect(fake.clientMock.removeChannel).not.toHaveBeenCalled();
  });

  it('shouldRemoveTheChannelOnceItStaysClosedAndCreateANewOneAfterwards', () => {
    const fake = fakeClient();
    const registry = createChannelRegistry<Handlers>();
    const params = {
      name: 'sala:3',
      client: fake.client,
      handlers: { onNews: vi.fn() },
      config: CONFIG,
      setup: vi.fn(),
    };
    registry.acquire(params).close();
    expect(fake.clientMock.removeChannel).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(fake.clientMock.removeChannel).toHaveBeenCalledWith(fake.channel);

    registry.acquire(params).close();
    vi.runAllTimers();
    expect(fake.clientMock.channel).toHaveBeenCalledTimes(2);
    expect(params.setup).toHaveBeenCalledTimes(2);
  });

  it('shouldKeepChannelsOfDifferentNamesApart', () => {
    const fake = fakeClient();
    const registry = createChannelRegistry<Handlers>();
    const base = { client: fake.client, handlers: { onNews: vi.fn() }, config: CONFIG };
    registry.acquire({ ...base, name: 'a', setup: vi.fn() });
    registry.acquire({ ...base, name: 'b', setup: vi.fn() });
    expect(fake.clientMock.channel).toHaveBeenCalledTimes(2);
  });
});

describe('isChannelFailure', () => {
  it.each(['CHANNEL_ERROR', 'TIMED_OUT'])('shouldTreat%sAsFailure', (status) => {
    expect(isChannelFailure(status)).toBe(true);
  });

  it.each(['SUBSCRIBED', 'CLOSED', 'JOINING'])('shouldNotTreat%sAsFailure', (status) => {
    expect(isChannelFailure(status)).toBe(false);
  });
});

describe('sendBroadcast', () => {
  function channelAnswering(response: string) {
    const send = vi.fn(async () => response);
    return { channel: { send } as unknown as RealtimeChannel, send };
  }

  it('shouldSendTheEventWithItsPayload', async () => {
    const { channel, send } = channelAnswering('ok');
    await sendBroadcast(channel, 'aviso', { valor: 1 });
    expect(send).toHaveBeenCalledWith({ type: 'broadcast', event: 'aviso', payload: { valor: 1 } });
  });

  it('shouldFailWhenTheServerDoesNotAcceptTheBroadcast', async () => {
    const { channel } = channelAnswering('timed out');
    await expect(sendBroadcast(channel, 'aviso', {})).rejects.toThrow(/aviso.*timed out/);
  });
});
