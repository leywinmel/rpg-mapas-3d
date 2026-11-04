import { useTableToolsStore } from '../hooks/table-tools-store';
import type { PingMessage, RulerMessage } from '../schemas';
import type { TableChannel, TableChannelHandlers } from './table-channel';
import { startTableToolsRuntime } from './table-tools-runtime';

const ME = '00000000-0000-0000-0000-0000000000a1';
const ANA = '00000000-0000-0000-0000-0000000000a2';
const STRANGER = '00000000-0000-0000-0000-0000000000a9';
const MAP = '00000000-0000-0000-0000-00000000b001';
const ROOM = '00000000-0000-0000-0000-00000000c001';

function fakeChannel() {
  const sent: { ruler: RulerMessage[]; cleared: number; pings: PingMessage[] } = {
    ruler: [],
    cleared: 0,
    pings: [],
  };
  let handlers: TableChannelHandlers | null = null;
  const channel: TableChannel = {
    sendRuler: async (message) => void sent.ruler.push(message),
    sendRulerCleared: async () => void (sent.cleared += 1),
    sendPing: async (message) => void sent.pings.push(message),
    close: vi.fn(),
  };
  const open = (options: { handlers: TableChannelHandlers }) => {
    handlers = options.handlers;
    return channel;
  };
  return { open, sent, receive: () => handlers as TableChannelHandlers };
}

function start(channel: ReturnType<typeof fakeChannel>, mapId: string | null = MAP) {
  let id = 0;
  return startTableToolsRuntime({
    roomId: ROOM,
    userId: ME,
    currentMapId: () => mapId,
    isMember: (userId) => userId === ANA || userId === ME,
    openChannel: channel.open,
    newId: () => `00000000-0000-0000-0000-00000000d00${(id += 1)}`,
  });
}

describe('startTableToolsRuntime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTableToolsStore.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  it('shouldShowAndSendMyPingAndForgetItLater', () => {
    const channel = fakeChannel();
    const runtime = start(channel);
    runtime.actions.ping({ x: 3, z: 4 });
    expect(useTableToolsStore.getState().pings).toHaveLength(1);
    expect(channel.sent.pings[0]).toMatchObject({ userId: ME, mapId: MAP, cell: { x: 3, z: 4 } });
    vi.advanceTimersByTime(5000);
    expect(useTableToolsStore.getState().pings).toHaveLength(0);
    runtime.dispose();
  });

  it('shouldRateLimitMyPings', () => {
    const channel = fakeChannel();
    const runtime = start(channel);
    for (let i = 0; i < 6; i += 1) runtime.actions.ping({ x: i, z: 0 });
    expect(channel.sent.pings).toHaveLength(3);
    runtime.dispose();
  });

  it('shouldIgnorePingsFromStrangersAndSpammers', () => {
    const channel = fakeChannel();
    const runtime = start(channel);
    const ping = (userId: string, n: number): PingMessage => ({
      id: `00000000-0000-0000-0000-00000000e00${n}`,
      userId,
      mapId: MAP,
      cell: { x: 1, z: 1 },
    });
    channel.receive().onPing(ping(STRANGER, 0));
    for (let n = 1; n <= 5; n += 1) channel.receive().onPing(ping(ANA, n));
    expect(useTableToolsStore.getState().pings.map((p) => p.userId)).toEqual([ANA, ANA, ANA]);
    runtime.dispose();
  });

  it('shouldShareTheRulerOnlyWhileAsked', () => {
    const channel = fakeChannel();
    const runtime = start(channel);
    const store = useTableToolsStore.getState();
    store.startRuler({ x: 0, z: 0 });
    store.moveRuler({ x: 2, z: 0 });
    expect(channel.sent.ruler).toHaveLength(0);
    store.setShareRuler(true);
    expect(channel.sent.ruler.at(-1)).toMatchObject({ from: { x: 0, z: 0 }, to: { x: 2, z: 0 } });
    store.clearRuler();
    expect(channel.sent.cleared).toBe(1);
    runtime.dispose();
  });

  it('shouldShowSharedRulersOfOthersAndDropThemWhenCleared', () => {
    const channel = fakeChannel();
    const runtime = start(channel);
    const message = { userId: ANA, mapId: MAP, from: { x: 0, z: 0 }, to: { x: 5, z: 5 } };
    channel.receive().onRuler(message);
    channel.receive().onRuler({ ...message, userId: STRANGER });
    expect(Object.keys(useTableToolsStore.getState().sharedRulers)).toEqual([ANA]);
    channel.receive().onRulerCleared({ userId: ANA });
    expect(useTableToolsStore.getState().sharedRulers).toEqual({});
    runtime.dispose();
  });
});
