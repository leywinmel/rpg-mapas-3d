import { setLogSink } from '@/lib/logger';
import type { AppSupabaseClient } from '@/lib/supabase';
import { TokenError } from './token-errors';
import { createTokensService } from './tokens-service';

type Result = { data: unknown; error: unknown };
type Call = { method: string; args: unknown[] };

const MAP_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const TOKEN_ID = '33333333-3333-4333-8333-333333333333';
const IMAGE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const TOKEN_ROW = {
  id: TOKEN_ID,
  map_id: MAP_ID,
  owner_id: null,
  kind: 'model',
  name: 'Goblin',
  image_path: null,
  model_key: 'creature',
  color_primary: '#336633',
  color_secondary: '#ccaa33',
  x: 3,
  z: 4,
  size: 1,
  level: 0,
  hp_current: 7,
  hp_max: 7,
  notes: '',
  hidden: false,
};

/** Cliente falso: registra as chamadas e responde cada consulta com a próxima da fila. */
function fakeClient(queries: Result[], options: { uploadError?: unknown } = {}) {
  const calls: Call[] = [];
  const record = (method: string, ...args: unknown[]) => calls.push({ method, args });
  const pending = [...queries];
  const builder: Record<string, unknown> = {};
  for (const method of [
    'select',
    'eq',
    'order',
    'insert',
    'update',
    'delete',
    'single',
    'maybeSingle',
  ]) {
    builder[method] = (...args: unknown[]) => {
      record(method, ...args);
      return builder;
    };
  }
  builder.then = (resolve: (value: Result) => unknown) =>
    resolve(pending.shift() ?? { data: null, error: null });
  const bucket = {
    upload: async (path: string) => {
      record('upload', path);
      return { data: { path }, error: options.uploadError ?? null };
    },
    remove: async (paths: string[]) => {
      record('remove', paths);
      return { data: [], error: null };
    },
    createSignedUrl: async (path: string) => {
      record('sign', path);
      return { data: { signedUrl: `https://files.test/${path}` }, error: null };
    },
  };
  const client = {
    from: (table: string) => {
      record('from', table);
      return builder;
    },
    storage: { from: () => bucket },
    auth: {
      getSession: async () => ({ data: { session: { user: { id: USER_ID } } }, error: null }),
    },
  };
  return { client: client as unknown as AppSupabaseClient, calls };
}

const argsOf = (calls: Call[], method: string) =>
  calls.filter((call) => call.method === method).map((call) => call.args);

const png = () => new File([new Uint8Array(8)], 'heroi.png', { type: 'image/png' });

const imageInput = () => ({
  mapId: MAP_ID,
  ownerId: null,
  name: 'Herói',
  size: 1,
  x: 0,
  z: 0,
  level: 0,
  hpMax: 10,
  hidden: false,
  look: { kind: 'image' as const, image: png() },
});

describe('tokensService', () => {
  beforeEach(() => setLogSink(() => undefined));

  it('shouldMapRowsToTokens', async () => {
    const { client } = fakeClient([{ data: [TOKEN_ROW], error: null }]);
    const [token] = await createTokensService(client).listTokens(MAP_ID);
    expect(token).toMatchObject({ id: TOKEN_ID, modelKey: 'creature', hpCurrent: 7, size: 1 });
  });

  it('shouldUploadTheImageIntoTheUserFolderBeforeCreating', async () => {
    const row = { ...TOKEN_ROW, kind: 'image', image_path: `${USER_ID}/${IMAGE_ID}.png` };
    const { client, calls } = fakeClient([{ data: row, error: null }]);
    const service = createTokensService(client, { newId: () => IMAGE_ID });
    await service.createToken(imageInput());
    expect(argsOf(calls, 'upload')[0]?.[0]).toBe(`${USER_ID}/${IMAGE_ID}.png`);
    expect(argsOf(calls, 'insert')[0]?.[0]).toMatchObject({
      image_path: `${USER_ID}/${IMAGE_ID}.png`,
      hp_current: 10,
      model_key: null,
    });
  });

  it('shouldRemoveTheUploadedImageWhenTheInsertFails', async () => {
    const { client, calls } = fakeClient([
      { data: null, error: { code: '22023', message: 'fora do mapa' } },
    ]);
    const service = createTokensService(client, { newId: () => IMAGE_ID });
    await expect(service.createToken(imageInput())).rejects.toMatchObject({ kind: 'invalid' });
    expect(argsOf(calls, 'remove')[0]?.[0]).toEqual([`${USER_ID}/${IMAGE_ID}.png`]);
  });

  it('shouldSendOnlyTheChangedColumns', async () => {
    const { client, calls } = fakeClient([{ data: { ...TOKEN_ROW, x: 5 }, error: null }]);
    await createTokensService(client).updateToken(TOKEN_ID, { x: 5, hpCurrent: undefined });
    expect(argsOf(calls, 'update')[0]?.[0]).toEqual({ x: 5 });
  });

  it('shouldTreatABlockedUpdateAsNotFound', async () => {
    const { client } = fakeClient([{ data: null, error: null }]);
    const update = createTokensService(client).updateToken(TOKEN_ID, { notes: 'oi' });
    await expect(update).rejects.toBeInstanceOf(TokenError);
    await expect(update).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('shouldMapPermissionErrorsToForbidden', async () => {
    const { client } = fakeClient([
      { data: null, error: { code: '42501', message: 'Só o mestre muda isso.' } },
    ]);
    const update = createTokensService(client).updateToken(TOKEN_ID, { name: 'X' });
    await expect(update).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('shouldReuseTheSignedImageUrl', async () => {
    const { client, calls } = fakeClient([]);
    const service = createTokensService(client, { now: () => 0 });
    await service.getImageUrl('a/b.png');
    await service.getImageUrl('a/b.png');
    expect(argsOf(calls, 'sign')).toHaveLength(1);
  });
});
