import { createEmptyMap } from '@/domain/map-v2';
import { setLogSink } from '@/lib/logger';
import { useTokensStore } from '../hooks/tokens-store';
import type { Token } from '../types';
import { createTokenActions, createTokensReloader } from './tokens-runtime';
import type { TokensChannel } from './tokens-channel';
import type { TokensService } from './tokens-service';

const MAP_ID = '11111111-1111-4111-8111-111111111111';
const PLAYER = {
  userId: '22222222-2222-4222-8222-222222222222',
  role: 'player',
  isGuest: false,
} as const;
const GM = { userId: '44444444-4444-4444-8444-444444444444', role: 'gm', isGuest: false } as const;

const token = (overrides: Partial<Token> = {}): Token => ({
  id: '33333333-3333-4333-8333-333333333333',
  mapId: MAP_ID,
  ownerId: PLAYER.userId,
  kind: 'model',
  name: 'Ana',
  imagePath: null,
  modelKey: 'figure',
  modelAssetId: null,
  colorPrimary: '#112233',
  colorSecondary: '#445566',
  x: 1,
  z: 1,
  size: 1,
  level: 0,
  hpCurrent: 5,
  hpMax: 5,
  notes: '',
  hidden: false,
  ...overrides,
});

function fakeChannel() {
  return {
    sendDrag: vi.fn(async () => undefined),
    announceSaved: vi.fn(async () => undefined),
    announceRemoved: vi.fn(async () => undefined),
    announcePieceMoved: vi.fn(async () => undefined),
    close: vi.fn(),
  } satisfies TokensChannel;
}

function setup(viewer: typeof PLAYER | typeof GM, service: Partial<TokensService> = {}) {
  const channel = fakeChannel();
  const fullService = { getImageUrl: vi.fn(), ...service } as unknown as TokensService;
  const { actions, dispose } = createTokenActions({
    service: fullService,
    viewer,
    channel: () => channel,
    reloader: createTokensReloader(fullService),
  });
  return { actions, dispose, channel };
}

describe('tokens runtime', () => {
  beforeEach(() => {
    setLogSink(() => undefined);
    useTokensStore.getState().reset();
    const model = createEmptyMap({ width: 10, depth: 10 });
    useTokensStore.getState().setView({ mapId: MAP_ID, model, cutaway: null });
  });

  it('shouldBroadcastTheDragOfAVisibleToken', () => {
    const { actions, channel, dispose } = setup(PLAYER);
    actions.dragToken(token(), { x: 2, z: 1 });
    expect(channel.sendDrag).toHaveBeenCalledWith({ tokenId: token().id, x: 2, z: 1 });
    dispose();
  });

  it('shouldNotBroadcastTheDragOfAnotherPlayersToken', () => {
    const { actions, channel, dispose } = setup(PLAYER);
    actions.dragToken(token({ ownerId: GM.userId }), { x: 2, z: 1 });
    expect(channel.sendDrag).not.toHaveBeenCalled();
    dispose();
  });

  it('shouldKeepHiddenOrFoggedTokensOffTheChannel', () => {
    const { actions, channel, dispose } = setup(GM);
    actions.dragToken(token({ hidden: true }), { x: 2, z: 1 });
    useTokensStore.getState().setFogCovers(() => true);
    actions.dragToken(token(), { x: 3, z: 1 });
    expect(channel.sendDrag).not.toHaveBeenCalled();
    dispose();
  });

  it('shouldAnnounceAMovedPieceOnTheTableChannel', () => {
    const { actions, channel, dispose } = setup(GM);
    const message = {
      mapId: MAP_ID,
      pieceId: 'carro-1',
      from: { x: 1, z: 1, rotation: 0, level: 0 },
      to: { x: 4, z: 1, rotation: 1, level: 0 },
    };
    actions.announcePieceMoved(message);
    expect(channel.announcePieceMoved).toHaveBeenCalledWith(message);
    dispose();
  });

  it('shouldRevertTheTokenWhenTheDropIsRefused', async () => {
    const original = token();
    const updateToken = vi.fn(async () => {
      throw new Error('recusado');
    });
    const { actions, dispose } = setup(PLAYER, { updateToken });
    useTokensStore.getState().setTokens([original]);
    await actions.dropToken(original, { x: 4, z: 4 });
    expect(useTokensStore.getState().tokens[0]).toMatchObject({ x: 1, z: 1 });
    dispose();
  });

  it('shouldSaveTheDropAndAnnounceIt', async () => {
    const original = token();
    const updateToken = vi.fn(async () => ({ ...original, x: 4, z: 4 }));
    const { actions, channel, dispose } = setup(PLAYER, { updateToken });
    useTokensStore.getState().setTokens([original]);
    await actions.dropToken(original, { x: 4, z: 4 });
    expect(updateToken).toHaveBeenCalledWith(original.id, { x: 4, z: 4, level: 0 });
    expect(channel.announceSaved).toHaveBeenCalledWith(original.id);
    dispose();
  });
});
