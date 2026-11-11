/**
 * Arquivo próprio do mapa (.rpgmap.json), versão 2: o mapa v2 (tamanho, cabeçalho e os pedaços
 * que fogem do chão liso padrão), e, se quem exporta quiser, a posição dos tokens e a névoa.
 *
 * A leitura confere tudo antes de devolver: o envelope com zod, cada pedaço com as mesmas regras
 * da leitura do banco (loadMapModel), os tokens dentro do mapa e a névoa nos pedaços do mapa.
 * Um arquivo do v1 (sem o campo "version") continua abrindo, convertido por convertMapV1ToV2.
 */
import { z } from 'zod';
import { createFogState, FOG_CLEAR, fogChunkFromText, fogChunkToText, type FogState } from '../fog';
import { importMap, type MapResult } from '../map-document';
import {
  chunkBounds,
  chunkGridSize,
  chunkKey,
  convertMapV1ToV2,
  isChunkInside,
  loadMapModel,
  MAX_LEVEL,
  MAX_MAP_SIZE_V2,
  serializeMapModel,
  type ChunkCoord,
  type MapModel,
} from '../map-v2';
import { CHUNK_CELLS, CHUNK_SIZE, MAX_REPORTED_ERRORS } from '../map-v2/constants';
import { fail, ok, parseWithSchema } from '../map-v2/validation';
import {
  fitsInMap,
  MAX_TOKEN_HP,
  MAX_TOKEN_NAME_LENGTH,
  MAX_TOKEN_NOTES_LENGTH,
  MAX_TOKEN_SIZE,
  MIN_TOKEN_SIZE,
  TOKEN_IMAGE_PATH_PATTERN,
  TOKEN_KINDS,
} from '../tokens';
import {
  MAP_FILE_FORMAT,
  MAP_FILE_VERSION,
  MAX_FILE_TOKENS,
  MAX_MAP_FILE_BYTES,
  MAX_MAP_FILE_MEGABYTES,
  MAX_MAP_NAME_LENGTH,
} from './constants';

const LARGEST_GRID = chunkGridSize({ width: MAX_MAP_SIZE_V2, depth: MAX_MAP_SIZE_V2 });
/** Pedaços do maior mapa: nem o mapa nem a névoa passam disso. */
const MAX_FILE_CHUNKS = LARGEST_GRID.columns * LARGEST_GRID.rows;
const MAX_EXPORTED_AT_LENGTH = 40;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
/** Chave curta de modelo (ex: "figure"); quem importa confere se o boneco existe. */
const MODEL_KEY = /^[a-z0-9][a-z0-9-]{0,47}$/;
const FOG_BITS = /^[01]+$/;

const NOT_A_MAP = 'O arquivo não é um mapa exportado pelo rpgmaps.';

function boundedInt(min: number, max: number) {
  return z.number().int().min(min).max(max);
}

const cellCoordinate = boundedInt(0, MAX_MAP_SIZE_V2 - 1);
const chunkCoordinate = boundedInt(0, LARGEST_GRID.columns - 1);
const hitPoints = boundedInt(0, MAX_TOKEN_HP).nullable();

/**
 * O que o arquivo guarda de cada token: aparência, casa, andar, vida e notas. Sem id nem dono:
 * o mapa importado vira um mapa novo, e quem joga nele é de outra mesa.
 */
export const fileTokenSchema = z.object({
  name: z.string().trim().min(1).max(MAX_TOKEN_NAME_LENGTH),
  kind: z.enum(TOKEN_KINDS),
  imagePath: z.string().regex(TOKEN_IMAGE_PATH_PATTERN).nullable(),
  modelKey: z.string().regex(MODEL_KEY).nullable(),
  /**
   * Modelo .glb da biblioteca do mestre. Opcional: arquivos antigos não têm. Na importação, só
   * serve se o modelo for de quem importa; senão o token vira boneco.
   */
  modelAssetId: z.uuid().nullable().optional(),
  colorPrimary: z.string().regex(HEX_COLOR).nullable(),
  colorSecondary: z.string().regex(HEX_COLOR).nullable(),
  x: cellCoordinate,
  z: cellCoordinate,
  size: boundedInt(MIN_TOKEN_SIZE, MAX_TOKEN_SIZE),
  level: boundedInt(0, MAX_LEVEL),
  hpCurrent: hitPoints,
  hpMax: hitPoints,
  notes: z.string().max(MAX_TOKEN_NOTES_LENGTH),
  hidden: z.boolean(),
});

export type FileToken = z.infer<typeof fileTokenSchema>;

const fileFogSchema = z.object({
  enabled: z.boolean(),
  defaultCovered: z.boolean(),
  /** Os bits de cada pedaço no mesmo texto "0101…" que o banco usa (map_fog_chunks.covered). */
  chunks: z
    .array(
      z.object({
        cx: chunkCoordinate,
        cz: chunkCoordinate,
        covered: z.string().length(CHUNK_CELLS).regex(FOG_BITS),
      }),
    )
    .max(MAX_FILE_CHUNKS),
});

const mapFileSchema = z.object({
  format: z.literal(MAP_FILE_FORMAT),
  version: z.literal(MAP_FILE_VERSION),
  exportedAt: z.string().max(MAX_EXPORTED_AT_LENGTH),
  map: z.object({
    name: z.string().trim().min(1).max(MAX_MAP_NAME_LENGTH),
    width: boundedInt(1, MAX_MAP_SIZE_V2),
    depth: boundedInt(1, MAX_MAP_SIZE_V2),
    /** O cabeçalho v2 e os documentos dos pedaços são conferidos por loadMapModel. */
    header: z.unknown(),
    chunks: z
      .array(z.object({ cx: chunkCoordinate, cz: chunkCoordinate, document: z.unknown() }))
      .max(MAX_FILE_CHUNKS),
  }),
  tokens: z.array(fileTokenSchema).max(MAX_FILE_TOKENS).optional(),
  fog: fileFogSchema.optional(),
});

export type MapFile = z.infer<typeof mapFileSchema>;

export type MapFileInput = {
  name: string;
  model: MapModel;
  /** Sem a lista, o arquivo não leva tokens. */
  tokens?: readonly FileToken[];
  /** Sem a névoa, o arquivo não leva névoa. */
  fog?: FogState | null;
  exportedAt?: Date;
};

function fogToFile(fog: FogState): NonNullable<MapFile['fog']> {
  const chunks = [...fog.chunks].map(([key, bits]) => {
    const [cx = 0, cz = 0] = key.split(',').map(Number);
    return { cx, cz, covered: fogChunkToText(bits) };
  });
  return { enabled: fog.enabled, defaultCovered: fog.defaultCovered, chunks };
}

/** O arquivo, como objeto. Só os pedaços diferentes do chão liso padrão entram. */
export function createMapFile(input: MapFileInput): MapFile {
  const { model } = input;
  const { header, chunks } = serializeMapModel(model);
  return {
    format: MAP_FILE_FORMAT,
    version: MAP_FILE_VERSION,
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    map: {
      name: input.name.trim(),
      width: model.size.width,
      depth: model.size.depth,
      header,
      chunks: chunks.map(({ coord, document }) => ({ cx: coord.cx, cz: coord.cz, document })),
    },
    ...(input.tokens && { tokens: [...input.tokens] }),
    ...(input.fog && { fog: fogToFile(input.fog) }),
  };
}

/** O texto do arquivo, sem espaços (um mapa grande cai pela metade). */
export function serializeMapFile(input: MapFileInput): string {
  return JSON.stringify(createMapFile(input));
}

/** O mapa lido do arquivo, pronto para virar um mapa novo na mesa. */
export type ImportedMap = {
  readonly name: string;
  readonly model: MapModel;
  readonly tokens: readonly FileToken[];
  /** Nulo quando o arquivo não trouxe névoa. */
  readonly fog: FogState | null;
  /** Veio de um arquivo do v1 (convertido): sem tokens nem névoa. */
  readonly legacy: boolean;
};

/** Mensagem para um arquivo grande demais, ou null. Quem lê o arquivo chama antes de abrir. */
export function mapFileSizeProblem(bytes: number): string | null {
  return bytes > MAX_MAP_FILE_BYTES
    ? `O arquivo passa de ${MAX_MAP_FILE_MEGABYTES} MB, o limite de um mapa.`
    : null;
}

function readJson(text: string): MapResult<Record<string, unknown>> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail(['O arquivo não é um mapa do rpgmaps (JSON inválido).']);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fail([NOT_A_MAP]);
  return ok(raw as Record<string, unknown>);
}

/** Arquivo do v1: o envelope antigo (até 100×100), convertido para o v2 sem perder nada. */
function parseLegacyFile(text: string): MapResult<ImportedMap> {
  const legacy = importMap(text);
  if (!legacy.ok) return legacy;
  const { name, width, depth, document } = legacy.value;
  const converted = convertMapV1ToV2(document, { width, depth });
  if (!converted.ok) return converted;
  return ok({ name, model: converted.value, tokens: [], fog: null, legacy: true });
}

function tokenProblems(model: MapModel, tokens: readonly FileToken[]): string[] {
  return tokens
    .filter((token) => !fitsInMap(model.size, token))
    .slice(0, MAX_REPORTED_ERRORS)
    .map((token) => `O token "${token.name}" está fora do mapa.`);
}

/** Zera os bits das casas de fora do mapa (o pedaço da borda é menor que 32×32). */
function maskOutside(model: MapModel, coord: ChunkCoord, bits: Uint8Array): Uint8Array {
  const bounds = chunkBounds(model.size, coord);
  for (let index = 0; index < bits.length; index += 1) {
    const x = index % CHUNK_SIZE;
    const z = Math.floor(index / CHUNK_SIZE);
    if (x >= bounds.width || z >= bounds.depth) bits[index] = FOG_CLEAR;
  }
  return bits;
}

function fogFromFile(model: MapModel, file: NonNullable<MapFile['fog']>): MapResult<FogState> {
  const fog = createFogState(model.size, file.enabled, file.defaultCovered);
  const chunks = new Map<string, Uint8Array>();
  for (const chunk of file.chunks) {
    const coord = { cx: chunk.cx, cz: chunk.cz };
    const key = chunkKey(coord);
    if (!isChunkInside(model.size, coord)) {
      return fail([`A névoa tem um pedaço fora do mapa: (${coord.cx}, ${coord.cz}).`]);
    }
    if (chunks.has(key)) return fail([`A névoa repete o pedaço (${coord.cx}, ${coord.cz}).`]);
    const bits = fogChunkFromText(chunk.covered);
    if (!bits) return fail(['A névoa do arquivo está malformada.']);
    chunks.set(key, maskOutside(model, coord, bits));
  }
  return ok({ ...fog, chunks });
}

function parseCurrentFile(raw: unknown): MapResult<ImportedMap> {
  const parsed = parseWithSchema(mapFileSchema, raw);
  if (!parsed.ok) return parsed;
  const { map, tokens = [], fog } = parsed.value;
  const size = { width: map.width, depth: map.depth };
  const loaded = loadMapModel({
    size,
    header: map.header,
    chunks: map.chunks.map(({ cx, cz, document }) => ({ coord: { cx, cz }, document })),
  });
  if (!loaded.ok) return loaded;
  const model = loaded.value;
  const outside = tokenProblems(model, tokens);
  if (outside.length > 0) return fail(outside);
  const fogState = fog ? fogFromFile(model, fog) : ok(null);
  if (!fogState.ok) return fogState;
  return ok({ name: map.name, model, tokens, fog: fogState.value, legacy: false });
}

/**
 * Lê o texto de um arquivo de mapa (v2 ou v1). Erro vem em frases curtas em PT-BR, para a tela
 * mostrar a quem importa; nada do arquivo é interpretado como HTML.
 */
export function parseMapFile(text: string): MapResult<ImportedMap> {
  // Cada caractere ocupa ao menos um byte: texto mais longo que o teto é arquivo grande demais.
  const tooBig = mapFileSizeProblem(text.length);
  if (tooBig) return fail([tooBig]);
  const json = readJson(text);
  if (!json.ok) return json;
  const raw = json.value;
  if (raw.format !== MAP_FILE_FORMAT) return fail([NOT_A_MAP]);
  if (raw.version === undefined) return parseLegacyFile(text);
  if (typeof raw.version === 'number' && raw.version > MAP_FILE_VERSION) {
    return fail(['Este arquivo foi feito numa versão mais nova do rpgmaps.']);
  }
  return parseCurrentFile(raw);
}
