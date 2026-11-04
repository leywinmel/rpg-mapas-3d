/**
 * Mapas no formato v2: o cabeçalho mora em maps.document e cada pedaço mexido numa linha de
 * map_chunks (pedaço sem linha é o chão liso padrão). O editor só conhece MapsV2Service; a
 * implementação com Supabase fica aqui e os testes passam um cliente falso.
 *
 * Mapa ainda no v1 abre convertido na memória e só vira v2 no banco ao primeiro salvar, que
 * grava tudo de uma vez (save_map_v2 troca pedaços, cabeçalho e versão numa transação só).
 */
import { z } from 'zod';
import type { GridSize } from '@/domain';
import {
  applyStoredChanges,
  chunkDocumentSchema,
  chunkKey,
  chunkGridSize,
  convertMapV1ToV2,
  createDefaultHeader,
  isEmptySavePlan,
  loadMapModel,
  mapHeaderSchema,
  MAP_V2_VERSION,
  MAX_MAP_SIZE_V2,
  planMapSave,
  type MapHeader,
  type MapModel,
  type ChunkCoord,
  type MapSavePlan,
  type StoredChunk,
} from '@/domain/map-v2';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { MapSummary } from '../types';
import { currentUserId } from './current-user';
import { MapError, toMapError } from './map-errors';
import { SUMMARY_COLUMNS, toSummary } from './maps-service';

/** Versão do v1 na coluna maps.schema_version (o MAP_DOCUMENT_VERSION do domínio). */
const LEGACY_SCHEMA_VERSION = 1;

/**
 * Pedaços por página ao carregar. O PostgREST corta a resposta em max_rows (1000, no
 * supabase/config.toml), e o maior mapa tem 1024 pedaços: sem paginar, o fim do mapa sumiria.
 */
export const CHUNK_PAGE_SIZE = 256;
const LARGEST_GRID = chunkGridSize({ width: MAX_MAP_SIZE_V2, depth: MAX_MAP_SIZE_V2 });
/**
 * Teto de páginas: os pedaços do maior mapa, mais uma página que volta vazia quando a conta
 * fecha certinho. Passar disso é resposta errada do servidor, e não um laço sem fim.
 */
const MAX_CHUNK_PAGES = Math.ceil((LARGEST_GRID.columns * LARGEST_GRID.rows) / CHUNK_PAGE_SIZE) + 1;

export type LoadedMapV2 = {
  summary: MapSummary;
  model: MapModel;
  /**
   * O que o banco guarda hoje no v2, para a próxima gravação mandar só a diferença. Nulo quando
   * o mapa ainda está no v1: a primeira gravação manda tudo.
   */
  saved: MapModel | null;
  /**
   * Hora da última gravação de cada pedaço com linha no banco (chave de chunkKey), para a
   * próxima leitura buscar só os que mudaram. Ausente no mapa ainda no v1.
   */
  chunkVersions?: ReadonlyMap<string, string>;
};

export type SaveMapV2Input = {
  mapId: string;
  /** O `saved` do carregamento (ou o `current` da última gravação que deu certo). */
  saved: MapModel | null;
  current: MapModel;
};

export type CreateMapV2Input = {
  roomId: string;
  name: string;
  size: GridSize;
  sortOrder: number;
  /** Clima da cena; sem ele, o padrão. */
  header?: MapHeader;
};

export type MapsV2Service = {
  loadMapV2: (mapId: string) => Promise<LoadedMapV2>;
  /**
   * Lê de novo um mapa já carregado buscando só os pedaços gravados depois de `previous` (e
   * trocando pelo chão liso os que perderam a linha). Se o tamanho ou a versão mudou, ou se
   * faltam as horas dos pedaços, carrega tudo, como loadMapV2.
   */
  refreshMapV2: (mapId: string, previous: LoadedMapV2) => Promise<LoadedMapV2>;
  /**
   * Grava só o que mudou, inclusive o tamanho (resizeMap): o banco apaga sozinho os pedaços que
   * saíram do mapa. Devolve a hora da gravação, ou null quando não havia nada a gravar.
   */
  saveMapV2: (input: SaveMapV2Input) => Promise<string | null>;
  /** Cria o mapa só com o cabeçalho: todo pedaço começa como o chão liso padrão. */
  createMapV2: (input: CreateMapV2Input) => Promise<MapSummary>;
};

const mapIdSchema = z.uuid();

const createInputSchema = z.object({
  roomId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  size: z.object({
    width: z.number().int().min(1).max(MAX_MAP_SIZE_V2),
    depth: z.number().int().min(1).max(MAX_MAP_SIZE_V2),
  }),
  sortOrder: z.number().int(),
  header: mapHeaderSchema.optional(),
});

const chunkVersionSchema = z.object({
  cx: z.number().int(),
  cz: z.number().int(),
  updated_at: z.string().optional(),
});
const chunkRowSchema = chunkVersionSchema.extend({ document: z.unknown() });

type ChunkVersionRow = z.infer<typeof chunkVersionSchema>;
type ChunkRow = z.infer<typeof chunkRowSchema>;
type ChunkQuery = { columns: string; since?: string };

const VERSION_COLUMNS = 'cx, cz, updated_at';
const DOCUMENT_COLUMNS = 'cx, cz, updated_at, document';

function toStored(row: ChunkRow): StoredChunk {
  return { coord: { cx: row.cx, cz: row.cz }, document: row.document };
}

/** Hora de cada pedaço; se faltar a de algum, nada (a próxima leitura vai inteira). */
function versionsOf(rows: readonly ChunkVersionRow[]): Map<string, string> | undefined {
  const versions = new Map<string, string>();
  for (const row of rows) {
    if (!row.updated_at) return undefined;
    versions.set(chunkKey(row), row.updated_at);
  }
  return versions;
}

/**
 * A hora mais antiga. O banco devolve todas no mesmo formato (UTC, com microssegundos), então
 * comparar o texto ordena certo sem perder os microssegundos que um Date jogaria fora.
 */
function oldest(times: readonly string[]): string | null {
  let found: string | null = null;
  for (const time of times) if (found === null || time < found) found = time;
  return found;
}

/** O mapa na tela e as horas dos pedaços dele. */
type Versioned = { model: MapModel; versions: ReadonlyMap<string, string> };

function compareVersions(previous: Versioned, now: ReadonlyMap<string, string>) {
  const changed: string[] = [];
  for (const [key, time] of now) if (previous.versions.get(key) !== time) changed.push(key);
  const removed: ChunkCoord[] = [];
  for (const key of previous.versions.keys()) {
    const coord = previous.model.chunks.get(key)?.coord;
    if (!now.has(key) && coord) removed.push(coord);
  }
  return { changed, removed };
}

/** Dados da resposta, ou o erro já traduzido para uma categoria que a tela explica. */
function dataOf<R extends { data: unknown; error: unknown }>(result: R): NonNullable<R['data']> {
  if (result.error) throw toMapError(result.error);
  const { data } = result;
  if (data === null || data === undefined) throw new MapError('unknown', null);
  return data as NonNullable<R['data']>;
}

/** Problemas do domínio ao ler o mapa: vão inteiros para o log, a tela mostra a frase curta. */
function unreadable(errors: readonly string[]): MapError {
  return new MapError('unreadable', null, { cause: new Error(errors.join(' | ')) });
}

/** Confere o que vai ao banco com os mesmos schemas da leitura: nada inválido é gravado [#51]. */
function validatePlan(plan: MapSavePlan): void {
  mapHeaderSchema.parse(plan.header);
  for (const { document } of plan.upserts) chunkDocumentSchema.parse(document);
}

function toRpcArgs(mapId: string, plan: MapSavePlan) {
  return {
    p_map_id: mapId,
    p_header: plan.header,
    p_upserts: plan.upserts.map(({ coord, document }) => ({
      cx: coord.cx,
      cz: coord.cz,
      document,
    })),
    p_deletes: plan.deletes.map(({ cx, cz }) => ({ cx, cz })),
    // O tamanho só vai quando muda: assim a gravação comum não depende dele.
    ...(plan.sizeChanged ? { p_width: plan.size.width, p_depth: plan.size.depth } : {}),
  };
}

export function createSupabaseMapsV2Service(client: AppSupabaseClient): MapsV2Service {
  /** Linhas de map_chunks do mapa, página a página (ver CHUNK_PAGE_SIZE). */
  async function chunkPages<T>(mapId: string, query: ChunkQuery, schema: z.ZodType<T>) {
    const found: T[] = [];
    for (let page = 0; page < MAX_CHUNK_PAGES; page += 1) {
      const from = page * CHUNK_PAGE_SIZE;
      const base = client.from('map_chunks').select(query.columns).eq('map_id', mapId);
      const filtered = query.since ? base.gte('updated_at', query.since) : base;
      const rows = dataOf(
        await filtered
          .order('cz')
          .order('cx')
          .range(from, from + CHUNK_PAGE_SIZE - 1),
      );
      found.push(...z.array(schema).parse(rows));
      if (rows.length < CHUNK_PAGE_SIZE) return found;
    }
    throw new MapError('unknown', null, { cause: new Error('Pedaços demais na resposta.') });
  }

  /**
   * Pedaços meio cobertos pela névoa, já recortados pelo banco (o jogador não recebe o que está
   * coberto; o mestre recebe lista vazia). Chegam sem hora: com eles, a leitura seguinte é inteira.
   */
  async function foggedChunks(mapId: string): Promise<ChunkRow[]> {
    const rows = dataOf(await client.rpc('get_fogged_map_chunks', { p_map_id: mapId }));
    return z.array(chunkRowSchema).parse(rows);
  }

  async function loadV2(mapId: string, summary: MapSummary, header: unknown) {
    const size = { width: summary.width, depth: summary.depth };
    const rows = [
      ...(await chunkPages(mapId, { columns: DOCUMENT_COLUMNS }, chunkRowSchema)),
      ...(await foggedChunks(mapId)),
    ];
    const loaded = loadMapModel({ size, header, chunks: rows.map(toStored) });
    if (!loaded.ok) throw unreadable(loaded.errors);
    const chunkVersions = versionsOf(rows);
    return {
      summary,
      model: loaded.value,
      saved: loaded.value,
      ...(chunkVersions && { chunkVersions }),
    };
  }

  async function mapRow(mapId: string) {
    mapIdSchema.parse(mapId);
    return dataOf(
      await client
        .from('maps')
        .select(`${SUMMARY_COLUMNS}, schema_version, document`)
        .eq('id', mapId)
        .single(),
    );
  }

  type MapRow = Awaited<ReturnType<typeof mapRow>>;

  async function loadMap(mapId: string, row: MapRow): Promise<LoadedMapV2> {
    const summary = toSummary(row);
    if (row.schema_version === MAP_V2_VERSION) return await loadV2(mapId, summary, row.document);
    if (row.schema_version !== LEGACY_SCHEMA_VERSION) {
      throw unreadable([`Versão ${row.schema_version} do mapa não é conhecida.`]);
    }
    const size = { width: summary.width, depth: summary.depth };
    const converted = convertMapV1ToV2(row.document, size);
    if (!converted.ok) throw unreadable(converted.errors);
    return { summary, model: converted.value, saved: null };
  }

  /** Só os pedaços gravados depois da leitura anterior; o resto do mapa fica como estava. */
  async function refreshChunks(mapId: string, row: MapRow, previous: Versioned) {
    const listed = await chunkPages(mapId, { columns: VERSION_COLUMNS }, chunkVersionSchema);
    const now = versionsOf(listed);
    if (!now) return await loadMap(mapId, row);
    const { changed, removed } = compareVersions(previous, now);
    const since = oldest(changed.map((key) => now.get(key) ?? ''));
    const fetched = since
      ? await chunkPages(mapId, { columns: DOCUMENT_COLUMNS, since }, chunkRowSchema)
      : [];
    // Pedaço gravado entre a lista e a busca chega com hora nova: entra também.
    const fresh = fetched.filter(
      (chunk) => chunk.updated_at !== previous.versions.get(chunkKey(chunk)),
    );
    const applied = applyStoredChanges(previous.model, {
      header: row.document,
      changed: fresh.map(toStored),
      removed,
    });
    if (!applied.ok) throw unreadable(applied.errors);
    const chunkVersions = new Map(now);
    for (const chunk of fresh)
      if (chunk.updated_at) chunkVersions.set(chunkKey(chunk), chunk.updated_at);
    const model = applied.value;
    return { summary: toSummary(row), model, saved: model, chunkVersions };
  }

  return {
    async refreshMapV2(mapId, previous) {
      try {
        const row = await mapRow(mapId);
        const { chunkVersions } = previous;
        const sameShape =
          row.schema_version === MAP_V2_VERSION &&
          row.width === previous.model.size.width &&
          row.depth === previous.model.size.depth;
        if (!sameShape || !chunkVersions) return await loadMap(mapId, row);
        // Com pedaço meio coberto pela névoa, a conta das horas não fecha: lê o mapa inteiro.
        if ((await foggedChunks(mapId)).length > 0) return await loadMap(mapId, row);
        return await refreshChunks(mapId, row, { model: previous.model, versions: chunkVersions });
      } catch (error) {
        throw toMapError(error);
      }
    },

    async loadMapV2(mapId) {
      try {
        return await loadMap(mapId, await mapRow(mapId));
      } catch (error) {
        throw toMapError(error);
      }
    },

    async saveMapV2({ mapId, saved, current }) {
      try {
        mapIdSchema.parse(mapId);
        const plan = planMapSave(saved, current);
        if (isEmptySavePlan(plan)) return null;
        validatePlan(plan);
        return dataOf(await client.rpc('save_map_v2', toRpcArgs(mapId, plan)));
      } catch (error) {
        throw toMapError(error);
      }
    },

    async createMapV2(input) {
      try {
        const { roomId, name, size, sortOrder, header } = createInputSchema.parse(input);
        const ownerId = await currentUserId(client);
        if (!ownerId) throw new MapError('session', null);
        const row = dataOf(
          await client
            .from('maps')
            .insert({
              owner_id: ownerId,
              room_id: roomId,
              name,
              width: size.width,
              depth: size.depth,
              schema_version: MAP_V2_VERSION,
              document: header ?? createDefaultHeader(),
              sort_order: sortOrder,
            })
            .select(SUMMARY_COLUMNS)
            .single(),
        );
        return toSummary(row);
      } catch (error) {
        throw toMapError(error);
      }
    },
  };
}
