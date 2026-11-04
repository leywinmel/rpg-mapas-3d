import { useInitiativeStore } from '../hooks/initiative-store';
import type { InitiativeBoard, InitiativeItem } from '../types';
import type { InitiativeChannel, InitiativeChannelHandlers } from './initiative-channel';
import { InitiativeError } from './initiative-errors';
import { startInitiativeRuntime } from './initiative-runtime';
import type { InitiativeService } from './initiative-service';

vi.mock('@/lib/report-error', () => ({ reportError: vi.fn() }));

const ROOM = '00000000-0000-0000-0000-00000000c001';

function entry(id: string, value: number, position: number, isCurrent = false): InitiativeItem {
  return {
    id,
    tokenId: null,
    ownerId: null,
    label: id,
    value,
    position,
    isCurrent,
    hidden: false,
  };
}

function fakeService(initial: InitiativeBoard) {
  let board = initial;
  const service: InitiativeService = {
    load: vi.fn(async () => board),
    add: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
    reorder: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    setTurn: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
  };
  return { service, setBoard: (next: InitiativeBoard) => (board = next) };
}

function fakeChannel() {
  let handlers: InitiativeChannelHandlers | null = null;
  const channel: InitiativeChannel = { announce: vi.fn(async () => undefined), close: vi.fn() };
  const open = (options: { handlers: InitiativeChannelHandlers }) => {
    handlers = options.handlers;
    return channel;
  };
  return { open, channel, receive: () => handlers as InitiativeChannelHandlers };
}

async function settle() {
  await vi.waitFor(() => expect(useInitiativeStore.getState().status).toBe('ready'));
}

describe('startInitiativeRuntime', () => {
  afterEach(() => {
    useInitiativeStore.getState().reset();
    vi.useRealTimers();
  });

  it('carrega a ordem e a rodada ao ligar', async () => {
    const { service } = fakeService({ entries: [entry('a', 12, 0)], round: 2 });
    const runtime = startInitiativeRuntime({
      roomId: ROOM,
      service,
      openChannel: fakeChannel().open,
    });
    await settle();
    expect(useInitiativeStore.getState().board.round).toBe(2);
    expect(useInitiativeStore.getState().board.entries).toHaveLength(1);
    runtime.dispose();
  });

  it('passar a vez grava a próxima entrada pela ordem e avisa a mesa', async () => {
    const { service } = fakeService({
      entries: [entry('lento', 5, 0), entry('rapido', 18, 1, true)],
      round: 1,
    });
    const channel = fakeChannel();
    const runtime = startInitiativeRuntime({ roomId: ROOM, service, openChannel: channel.open });
    await settle();

    await expect(runtime.actions.next()).resolves.toBe(true);
    expect(service.setTurn).toHaveBeenCalledWith(ROOM, { currentId: 'lento', round: 1 });
    expect(channel.channel.announce).toHaveBeenCalledTimes(1);
    runtime.dispose();
  });

  it('a vez volta ao primeiro e a rodada sobe depois do último', async () => {
    const { service } = fakeService({
      entries: [entry('lento', 5, 0, true), entry('rapido', 18, 1)],
      round: 3,
    });
    const runtime = startInitiativeRuntime({
      roomId: ROOM,
      service,
      openChannel: fakeChannel().open,
    });
    await settle();
    await runtime.actions.next();
    expect(service.setTurn).toHaveBeenCalledWith(ROOM, { currentId: 'rapido', round: 4 });
    runtime.dispose();
  });

  it('a gravação negada devolve false e não avisa a mesa', async () => {
    const { service } = fakeService({ entries: [entry('a', 12, 0)], round: 0 });
    vi.mocked(service.update).mockRejectedValueOnce(new InitiativeError('forbidden', null));
    const channel = fakeChannel();
    const runtime = startInitiativeRuntime({ roomId: ROOM, service, openChannel: channel.open });
    await settle();

    const [first] = useInitiativeStore.getState().board.entries;
    await expect(runtime.actions.update(first as InitiativeItem, { value: 3 })).resolves.toBe(
      false,
    );
    expect(channel.channel.announce).not.toHaveBeenCalled();
    runtime.dispose();
  });

  it('encerrar o combate sobe a falha para a janela de confirmação', async () => {
    const { service } = fakeService({ entries: [entry('a', 12, 0)], round: 1 });
    vi.mocked(service.clear).mockRejectedValueOnce(new InitiativeError('network', null));
    const runtime = startInitiativeRuntime({
      roomId: ROOM,
      service,
      openChannel: fakeChannel().open,
    });
    await settle();
    await expect(runtime.actions.clear()).rejects.toBeInstanceOf(InitiativeError);
    runtime.dispose();
  });

  it('o aviso de outra pessoa relê a ordem logo depois', async () => {
    vi.useFakeTimers();
    const { service, setBoard } = fakeService({ entries: [], round: 0 });
    const channel = fakeChannel();
    const runtime = startInitiativeRuntime({ roomId: ROOM, service, openChannel: channel.open });
    await vi.runAllTimersAsync();
    setBoard({ entries: [entry('novo', 9, 0)], round: 0 });

    channel.receive().onChanged();
    await vi.runAllTimersAsync();
    expect(useInitiativeStore.getState().board.entries.map((item) => item.id)).toEqual(['novo']);
    runtime.dispose();
    expect(channel.channel.close).toHaveBeenCalled();
  });
});
