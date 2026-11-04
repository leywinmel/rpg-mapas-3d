import { createEmptyDocument, DEFAULT_AMBIENCE } from '@/domain';
import {
  chunkKey,
  createEmptyMap,
  DEFAULT_FLOOR_TILE,
  getChunk,
  isDefaultChunk,
  paintTerrainRect,
  placePiece,
  removePiece,
  resizeMap,
  serializeChunk,
  serializeMapModel,
  terrainAt,
  type MapModel,
  type MapPiece,
} from '@/domain/map-v2';
import type { AppSupabaseClient } from '@/lib/supabase';
import { MapError } from './map-errors';
import { CHUNK_PAGE_SIZE, createSupabaseMapsV2Service } from './map-v2-service';

type Result = { data: unknown; error: unknown };
type Call = { method: string; args: unknown[] };

const MAP_ID = '44444444-4444-4444-8444-444444444444';
const ROOM_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const SAVED_AT = '2026-11-03T15:00:00+00:00';

const SUMMARY_ROW = {
  id: MAP_ID,
  name: 'Vila do Porto',
  width: 70,
  depth: 40,
  sort_order: 0,
  updated_at: '2026-11-03T14:00:00+00:00',
};

/**
 * Cliente falso do Supabase: registra as chamadas, na ordem, e responde cada consulta (de
 * tabela) com a próxima resposta da fila; o RPC tem resposta própria.
 */
function fakeClient(queries: Result[] = [], rpc: Result = { data: SAVED_AT, error: null }) {
  const calls: Call[] = [];
  const record = (method: string, ...args: unknown[]) => calls.push({ method, args });
  const pending = [...queries];

  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'order', 'range', 'insert', 'single']) {
    builder[method] = (...args: unknown[]) => {
      record(method, ...args);
      return builder;
    };
  }
  builder.then = (resolve: (value: Result) => unknown) =>
    resolve(pending.shift() ?? { data: [], error: null });

  const client = {
    from: (table: string) => {
      record('from', table);
      return builder;
    },
    rpc: async (name: string, params: unknown) => {
      // A leitura dos pedaços meio cobertos pela névoa: sem névoa, nenhum.
      if (name === 'get_fogged_map_chunks') return { data: [], error: null };
      record('rpc', name, params);
      return rpc;
    },
    auth: {
      getSession: async () => ({ data: { session: { user: { id: USER_ID } } }, error: null }),
    },
  };
  return { client: client as unknown as AppSupabaseClient, calls };
}

function argsOf(calls: Call[], method: string): unknown[][] {
  return calls.filter((call) => call.method === method).map((call) => call.args);
}

type RpcParams = {
  p_map_id: string;
  p_header: unknown;
  p_upserts: Array<{ cx: number; cz: number; document: unknown }>;
  p_deletes: Array<{ cx: number; cz: number }>;
  p_width?: number;
  p_depth?: number;
};

function rpcParams(calls: Call[]): RpcParams {
  const [args] = argsOf(calls, 'rpc');
  return args?.[1] as RpcParams;
}

const barrel = (overrides: Partial<MapPiece> = {}): MapPiece => ({
  id: 'barril-1',
  asset: { source: 'catalog', key: 'barril' },
  x: 3,
  z: 4,
  level: 0,
  rotation: 0,
  footprint: { width: 1, depth: 1 },
  scale: 1,
  ...overrides,
});

function ok<T>(result: { ok: true; value: T } | { ok: false; errors: string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' | '));
  return result.value;
}

/** Mapa 70×40 com um barril no pedaço (0, 0) e chão de madeira no (2, 1). */
function editedMap(): MapModel {
  const withBarrel = ok(placePiece(createEmptyMap({ width: 70, depth: 40 }), barrel()));
  const paint = { from: { x: 65, z: 35 }, to: { x: 66, z: 36 }, tile: 'piso-madeira' };
  return ok(paintTerrainRect(withBarrel, paint));
}

/** As linhas de map_chunks que o banco teria para o mapa (só os pedaços fora do padrão). */
function chunkRows(model: MapModel) {
  return serializeMapModel(model).chunks.map(({ coord, document }) => ({
    cx: coord.cx,
    cz: coord.cz,
    document: JSON.parse(JSON.stringify(document)) as unknown,
  }));
}

const BEFORE = '2026-11-04T10:00:00.000001+00:00';
const AFTER = '2026-11-04T10:05:00.000002+00:00';

function versioned(rows: ReturnType<typeof chunkRows>, time: string) {
  return rows.map((row) => ({ ...row, updated_at: time }));
}

describe('refreshMapV2', () => {
  const v2Row = (model: MapModel) => ({
    data: { ...SUMMARY_ROW, schema_version: 2, document: model.header },
    error: null,
  });

  async function loadedWithVersions(model: MapModel) {
    const { client } = fakeClient([
      v2Row(model),
      { data: versioned(chunkRows(model), BEFORE), error: null },
    ]);
    return createSupabaseMapsV2Service(client).loadMapV2(MAP_ID);
  }

  it('shouldFetchOnlyTheChunksSavedSinceTheLastReadAndClearTheDeletedOnes', async () => {
    const previous = await loadedWithVersions(editedMap());
    expect(previous.chunkVersions?.get(chunkKey({ cx: 0, cz: 0 }))).toBe(BEFORE);
    // O mestre pôs um barril no pedaço (0, 0), pintou o (1, 0) e o (2, 1) voltou a ser liso.
    const withBarrel = ok(placePiece(previous.model, barrel({ id: 'barril-2', x: 5, z: 5 })));
    const painted = ok(
      paintTerrainRect(withBarrel, { from: { x: 40, z: 2 }, to: { x: 41, z: 3 }, tile: 'terra' }),
    );
    const changed = chunkRows(painted).filter((row) => row.cz === 0);
    const { client, calls } = fakeClient([
      v2Row(painted),
      { data: changed.map(({ cx, cz }) => ({ cx, cz, updated_at: AFTER })), error: null },
      { data: versioned(changed, AFTER), error: null },
    ]);
    const next = await createSupabaseMapsV2Service(client).refreshMapV2(MAP_ID, previous);
    expect(calls).toContainEqual({ method: 'gte', args: ['updated_at', AFTER] });
    expect(getChunk(next.model, { cx: 0, cz: 0 }).pieces.map((piece) => piece.id)).toEqual([
      'barril-1',
      'barril-2',
    ]);
    expect(terrainAt(next.model, { x: 40, z: 2 })?.tile).toBe('terra');
    expect(isDefaultChunk(getChunk(next.model, { cx: 2, cz: 1 }))).toBe(true);
    // O que não mudou é o mesmo objeto: a cena não redesenha.
    expect(getChunk(next.model, { cx: 1, cz: 1 })).toBe(getChunk(previous.model, { cx: 1, cz: 1 }));
    expect(next.chunkVersions?.get(chunkKey({ cx: 1, cz: 0 }))).toBe(AFTER);
    expect(next.chunkVersions?.has(chunkKey({ cx: 2, cz: 1 }))).toBe(false);
  });

  it('shouldSkipTheDocumentsWhenNoChunkChanged', async () => {
    const model = editedMap();
    const previous = await loadedWithVersions(model);
    const listed = chunkRows(model).map(({ cx, cz }) => ({ cx, cz, updated_at: BEFORE }));
    const { client, calls } = fakeClient([v2Row(model), { data: listed, error: null }]);
    const next = await createSupabaseMapsV2Service(client).refreshMapV2(MAP_ID, previous);
    expect(argsOf(calls, 'from')).toEqual([['maps'], ['map_chunks']]);
    expect(argsOf(calls, 'gte')).toEqual([]);
    expect(getChunk(next.model, { cx: 0, cz: 0 })).toBe(getChunk(previous.model, { cx: 0, cz: 0 }));
  });

  it('shouldLoadEverythingAgainWhenTheSizeChanged', async () => {
    const previous = await loadedWithVersions(editedMap());
    const grown = ok(resizeMap(previous.model, { width: 80, depth: 40 }));
    const { client, calls } = fakeClient([
      {
        data: { ...SUMMARY_ROW, width: 80, schema_version: 2, document: grown.header },
        error: null,
      },
      { data: versioned(chunkRows(grown), AFTER), error: null },
    ]);
    const next = await createSupabaseMapsV2Service(client).refreshMapV2(MAP_ID, previous);
    expect(next.model.size.width).toBe(80);
    expect(argsOf(calls, 'gte')).toEqual([]);
  });
});

describe('loadMapV2', () => {
  it('shouldLoadAV2MapFillingTheChunksThatHaveNoRow', async () => {
    const model = editedMap();
    const { client, calls } = fakeClient([
      { data: { ...SUMMARY_ROW, schema_version: 2, document: model.header }, error: null },
      { data: chunkRows(model), error: null },
    ]);
    const loaded = await createSupabaseMapsV2Service(client).loadMapV2(MAP_ID);
    expect(loaded.summary).toMatchObject({ id: MAP_ID, width: 70, depth: 40 });
    expect(loaded.saved).toBe(loaded.model);
    expect(loaded.model.chunks.size).toBe(6);
    expect(getChunk(loaded.model, { cx: 0, cz: 0 }).pieces.map((piece) => piece.id)).toEqual([
      'barril-1',
    ]);
    expect(terrainAt(loaded.model, { x: 66, z: 36 })?.tile).toBe('piso-madeira');
    expect(terrainAt(loaded.model, { x: 40, z: 35 })?.tile).toBe(DEFAULT_FLOOR_TILE);
    expect(argsOf(calls, 'from')).toEqual([['maps'], ['map_chunks']]);
    expect(calls).toContainEqual({ method: 'eq', args: ['map_id', MAP_ID] });
    expect(calls).toContainEqual({ method: 'range', args: [0, CHUNK_PAGE_SIZE - 1] });
  });

  it('shouldReadEveryPageOfChunks', async () => {
    const model = createEmptyMap({ width: 1000, depth: 1000 });
    const row = (index: number) => ({
      cx: index % 32,
      cz: Math.floor(index / 32),
      document: serializeChunk(getChunk(model, { cx: index % 32, cz: Math.floor(index / 32) })),
    });
    const page = (start: number, length: number) =>
      Array.from({ length }, (_, offset) => row(start + offset));
    const { client, calls } = fakeClient([
      {
        data: {
          ...SUMMARY_ROW,
          width: 1000,
          depth: 1000,
          schema_version: 2,
          document: model.header,
        },
        error: null,
      },
      { data: page(0, CHUNK_PAGE_SIZE), error: null },
      { data: page(CHUNK_PAGE_SIZE, CHUNK_PAGE_SIZE), error: null },
      { data: page(2 * CHUNK_PAGE_SIZE, 10), error: null },
    ]);
    const loaded = await createSupabaseMapsV2Service(client).loadMapV2(MAP_ID);
    expect(loaded.model.chunks.size).toBe(1024);
    expect(argsOf(calls, 'range')).toEqual([
      [0, CHUNK_PAGE_SIZE - 1],
      [CHUNK_PAGE_SIZE, 2 * CHUNK_PAGE_SIZE - 1],
      [2 * CHUNK_PAGE_SIZE, 3 * CHUNK_PAGE_SIZE - 1],
    ]);
  });

  it('shouldConvertAV1MapWithoutTouchingTheChunksTable', async () => {
    const document = createEmptyDocument({ width: 12, depth: 10 }, 'piso-madeira');
    const { client, calls } = fakeClient([
      { data: { ...SUMMARY_ROW, width: 12, depth: 10, schema_version: 1, document }, error: null },
    ]);
    const loaded = await createSupabaseMapsV2Service(client).loadMapV2(MAP_ID);
    expect(loaded.saved).toBeNull();
    expect(terrainAt(loaded.model, { x: 11, z: 9 })).toEqual({ tile: 'piso-madeira', height: 0 });
    expect(argsOf(calls, 'from')).toEqual([['maps']]);
  });

  it('shouldCallABrokenMapUnreadableAndKeepTheDetailForTheLog', async () => {
    const { client } = fakeClient([
      { data: { ...SUMMARY_ROW, schema_version: 2, document: { version: 2 } }, error: null },
    ]);
    const error = await createSupabaseMapsV2Service(client)
      .loadMapV2(MAP_ID)
      .catch((e) => e);
    expect(error).toBeInstanceOf(MapError);
    expect(error).toMatchObject({ kind: 'unreadable' });
    expect(String((error as MapError).cause)).toMatch(/clima|ambience|Invalid|inválid/i);
  });

  it('shouldRefuseAVersionItDoesNotKnow', async () => {
    const { client } = fakeClient([
      { data: { ...SUMMARY_ROW, schema_version: 3, document: {} }, error: null },
    ]);
    await expect(createSupabaseMapsV2Service(client).loadMapV2(MAP_ID)).rejects.toMatchObject({
      kind: 'unreadable',
    });
  });

  it('shouldTranslateAMissingMap', async () => {
    const { client } = fakeClient([
      { data: null, error: { code: 'PGRST116', message: 'JSON object requested, 0 rows' } },
    ]);
    await expect(createSupabaseMapsV2Service(client).loadMapV2(MAP_ID)).rejects.toMatchObject({
      kind: 'not-found',
      code: 'PGRST116',
    });
  });

  it('shouldRejectAnIdThatIsNotAUuidBeforeAskingTheServer', async () => {
    const { client, calls } = fakeClient();
    await expect(createSupabaseMapsV2Service(client).loadMapV2('../maps')).rejects.toMatchObject({
      kind: 'invalid',
    });
    expect(calls).toEqual([]);
  });
});

describe('saveMapV2', () => {
  it('shouldSendOnlyTheTouchedChunksAndTheHeader', async () => {
    const saved = editedMap();
    const current = ok(placePiece(saved, barrel({ id: 'barril-2', x: 40, z: 35 })));
    const { client, calls } = fakeClient();
    const savedAt = await createSupabaseMapsV2Service(client).saveMapV2({
      mapId: MAP_ID,
      saved,
      current,
    });
    expect(savedAt).toBe(SAVED_AT);
    const params = rpcParams(calls);
    expect(argsOf(calls, 'rpc')[0]?.[0]).toBe('save_map_v2');
    expect(params.p_map_id).toBe(MAP_ID);
    expect(params.p_header).toBe(current.header);
    expect(params.p_upserts.map(({ cx, cz }) => [cx, cz])).toEqual([[1, 1]]);
    expect(params.p_deletes).toEqual([]);
    // Sem mudar de tamanho, o pedido nem fala de tamanho.
    expect(params).not.toHaveProperty('p_width');
  });

  it('shouldSendTheNewSizeWhenTheMapWasResized', async () => {
    const saved = editedMap();
    const current = ok(resizeMap(saved, { width: 40, depth: 33 }));
    const { client, calls } = fakeClient();
    await createSupabaseMapsV2Service(client).saveMapV2({ mapId: MAP_ID, saved, current });
    expect(rpcParams(calls)).toMatchObject({ p_width: 40, p_depth: 33 });
  });

  it('shouldDeleteTheChunkThatWentBackToTheDefault', async () => {
    const saved = editedMap();
    const current = ok(removePiece(saved, { id: 'barril-1', x: 3, z: 4 }));
    const { client, calls } = fakeClient();
    await createSupabaseMapsV2Service(client).saveMapV2({ mapId: MAP_ID, saved, current });
    expect(rpcParams(calls).p_upserts).toEqual([]);
    expect(rpcParams(calls).p_deletes).toEqual([{ cx: 0, cz: 0 }]);
  });

  it('shouldNotCallTheServerWhenNothingChanged', async () => {
    const model = editedMap();
    const { client, calls } = fakeClient();
    const savedAt = await createSupabaseMapsV2Service(client).saveMapV2({
      mapId: MAP_ID,
      saved: model,
      current: model,
    });
    expect(savedAt).toBeNull();
    expect(calls).toEqual([]);
  });

  it('shouldWriteEverythingOnTheFirstSaveOfAV1Map', async () => {
    const current = editedMap();
    const { client, calls } = fakeClient();
    await createSupabaseMapsV2Service(client).saveMapV2({ mapId: MAP_ID, saved: null, current });
    const params = rpcParams(calls);
    expect(params.p_upserts.map(({ cx, cz }) => [cx, cz])).toEqual([
      [0, 0],
      [2, 1],
    ]);
    expect(params.p_deletes).toEqual([]);
  });

  it('shouldNotSendAnInvalidChunk', async () => {
    const saved = editedMap();
    const chunk = getChunk(saved, { cx: 0, cz: 0 });
    // Peça com escala fora do limite, posta sem passar pelas operações (que a recusariam).
    const broken = { ...chunk, pieces: [{ ...chunk.pieces[0]!, scale: 99 }] };
    const current = { ...saved, chunks: new Map(saved.chunks).set('0,0', broken) };
    const { client, calls } = fakeClient();
    await expect(
      createSupabaseMapsV2Service(client).saveMapV2({ mapId: MAP_ID, saved, current }),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(argsOf(calls, 'rpc')).toEqual([]);
  });

  it.each([
    [{ code: '42501', message: 'Só o mestre da mesa pode editar este mapa.' }, 'forbidden'],
    [
      {
        code: '23514',
        message:
          'new row for relation "map_chunks" violates check constraint "map_chunks_document_size"',
      },
      'too-large',
    ],
    [{ code: '22023', message: 'Pedaço fora do mapa ou sem documento.' }, 'invalid'],
    [{ message: 'TypeError: Failed to fetch' }, 'network'],
    [{ code: 'XX000', message: 'boom' }, 'unknown'],
  ])('shouldTranslateTheServerError %#', async (serverError, kind) => {
    const saved = editedMap();
    const current = ok(placePiece(saved, barrel({ id: 'barril-2', x: 40, z: 35 })));
    const { client } = fakeClient([], { data: null, error: serverError });
    await expect(
      createSupabaseMapsV2Service(client).saveMapV2({ mapId: MAP_ID, saved, current }),
    ).rejects.toMatchObject({ kind });
  });
});

describe('createMapV2', () => {
  it('shouldCreateOnlyTheHeaderAtVersionTwo', async () => {
    const { client, calls } = fakeClient([{ data: SUMMARY_ROW, error: null }]);
    const summary = await createSupabaseMapsV2Service(client).createMapV2({
      roomId: ROOM_ID,
      name: '  Vila do Porto ',
      size: { width: 1000, depth: 1000 },
      sortOrder: 2,
    });
    expect(summary.id).toBe(MAP_ID);
    const [row] = argsOf(calls, 'insert')[0] ?? [];
    expect(row).toEqual({
      owner_id: USER_ID,
      room_id: ROOM_ID,
      name: 'Vila do Porto',
      width: 1000,
      depth: 1000,
      schema_version: 2,
      document: { version: 2, ambience: DEFAULT_AMBIENCE },
      sort_order: 2,
    });
    expect(argsOf(calls, 'from')).toEqual([['maps']]);
  });

  it('shouldRefuseASizeAboveTheLimitBeforeAskingTheServer', async () => {
    const { client, calls } = fakeClient();
    await expect(
      createSupabaseMapsV2Service(client).createMapV2({
        roomId: ROOM_ID,
        name: 'Grande demais',
        size: { width: 1001, depth: 10 },
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(calls).toEqual([]);
  });

  it('shouldAskToSignInAgainWithoutASession', async () => {
    const { client } = fakeClient();
    const noSession = {
      ...client,
      auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    } as unknown as AppSupabaseClient;
    await expect(
      createSupabaseMapsV2Service(noSession).createMapV2({
        roomId: ROOM_ID,
        name: 'Sem sessão',
        size: { width: 10, depth: 10 },
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({ kind: 'session' });
  });
});
