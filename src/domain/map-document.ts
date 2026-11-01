/**
 * Formato do diorama salvo no banco (coluna maps.document) e no arquivo exportado.
 * É versionado: um mapa salvo hoje continua abrindo quando o formato evoluir,
 * porque cada versão antiga ganha uma função de atualização em MIGRATIONS.
 */
import { z } from 'zod';
import { isEdgeInside, MAX_MAP_SIZE, type GridSize } from './grid';

export const MAP_DOCUMENT_VERSION = 1;
export const EXPORT_FORMAT = 'rpgmaps.map';
/** Mesmo limite do banco (2 MB), para o import falhar com mensagem clara e não no servidor. */
export const MAX_EXPORT_BYTES = 2_000_000;

export const MAX_PROPS = 2000;
export const MAX_WALLS = 20_000;
export const MAX_FLOOR_HEIGHT = 10;
export const MIN_WALL_HEIGHT = 1;
export const MAX_WALL_HEIGHT = 4;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.');
/** Chave de uma peça do catálogo embutido (ex: "piso-pedra"), definido na feature de cena. */
const catalogKey = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/, 'Peça desconhecida.');
const coordinate = z.number().int().min(0).max(MAX_MAP_SIZE);

const floorSchema = z.object({
  x: coordinate,
  z: coordinate,
  tile: catalogKey,
  /** Degraus de altura do bloco de chão (0 = nível do chão). */
  height: z.number().int().min(0).max(MAX_FLOOR_HEIGHT),
});

const wallSchema = z.object({
  x: coordinate,
  z: coordinate,
  /** "north" = aresta no lado de z menor da casa; "west" = lado de x menor. */
  side: z.enum(['north', 'west']),
  style: catalogKey,
  height: z.number().int().min(MIN_WALL_HEIGHT).max(MAX_WALL_HEIGHT),
});

const propAssetSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('catalog'), key: catalogKey }),
  /** Modelo .glb enviado pelo mestre (tabela map_assets). */
  z.object({ source: z.literal('upload'), assetId: z.uuid() }),
]);

const propSchema = z.object({
  id: z.string().min(1).max(40),
  asset: propAssetSchema,
  /** Posição livre (não presa à grade), em unidades do mundo. */
  x: z.number().min(0).max(MAX_MAP_SIZE),
  z: z.number().min(0).max(MAX_MAP_SIZE),
  elevation: z.number().min(0).max(50).default(0),
  rotation: z.number().min(0).lt(360).default(0),
  scale: z.number().min(0.25).max(4).default(1),
});

const ambienceSchema = z.object({
  /** Clima pronto da cena (ex: "masmorra"); a cena traduz em luzes e cores. */
  preset: catalogKey,
  fogColor: hexColor,
  /** Intensidade geral da luz, 0 = breu, 1 = normal, 2 = muito claro. */
  light: z.number().min(0).max(2),
});

export const mapDocumentSchema = z.object({
  version: z.literal(MAP_DOCUMENT_VERSION),
  ambience: ambienceSchema,
  floors: z.array(floorSchema).max(MAX_MAP_SIZE * MAX_MAP_SIZE),
  walls: z.array(wallSchema).max(MAX_WALLS),
  props: z.array(propSchema).max(MAX_PROPS),
});

export type MapDocument = z.infer<typeof mapDocumentSchema>;
export type FloorTile = MapDocument['floors'][number];
export type Wall = MapDocument['walls'][number];
export type Prop = MapDocument['props'][number];
export type Ambience = MapDocument['ambience'];

export const DEFAULT_AMBIENCE: Ambience = { preset: 'masmorra', fogColor: '#0d0b14', light: 0.6 };

export type MapResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/** Mapa novo: chão inteiro com a peça escolhida, sem paredes nem objetos. */
export function createEmptyDocument(size: GridSize, floorTile = 'piso-pedra'): MapDocument {
  const floors: FloorTile[] = [];
  for (let z = 0; z < size.depth; z += 1) {
    for (let x = 0; x < size.width; x += 1) floors.push({ x, z, tile: floorTile, height: 0 });
  }
  return {
    version: MAP_DOCUMENT_VERSION,
    ambience: { ...DEFAULT_AMBIENCE },
    floors,
    walls: [],
    props: [],
  };
}

/** Atualizações de formato: a chave é a versão de origem; cada função leva para a seguinte. */
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {
  // Exemplo para a próxima versão: 1: (doc) => ({ ...doc, version: 2, novoCampo: [] }),
};

function migrate(input: unknown): MapResult<unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, errors: ['O mapa não está num formato reconhecido.'] };
  }
  let doc = input as Record<string, unknown>;
  let version = typeof doc.version === 'number' ? doc.version : NaN;
  if (!Number.isInteger(version) || version < 1) {
    return { ok: false, errors: ['O mapa não informa a versão do formato.'] };
  }
  if (version > MAP_DOCUMENT_VERSION) {
    return { ok: false, errors: ['Este mapa foi feito numa versão mais nova do rpgmaps.'] };
  }
  while (version < MAP_DOCUMENT_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return { ok: false, errors: [`Não sei atualizar mapas da versão ${version}.`] };
    doc = step(doc);
    version += 1;
  }
  return { ok: true, value: doc };
}

/** Valida um documento (vindo do banco ou de um arquivo) contra o tamanho do mapa. */
export function parseMapDocument(input: unknown, size: GridSize): MapResult<MapDocument> {
  const migrated = migrate(input);
  if (!migrated.ok) return migrated;

  const parsed = mapDocumentSchema.safeParse(migrated.value);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    };
  }

  const errors = checkBounds(parsed.data, size);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: parsed.data };
}

function checkBounds(doc: MapDocument, size: GridSize): string[] {
  const errors: string[] = [];
  const seenFloors = new Set<number>();
  for (const floor of doc.floors) {
    if (floor.x >= size.width || floor.z >= size.depth) {
      errors.push(`Chão fora do mapa em (${floor.x}, ${floor.z}).`);
      continue;
    }
    const key = floor.z * size.width + floor.x;
    if (seenFloors.has(key)) errors.push(`Dois chãos na mesma casa (${floor.x}, ${floor.z}).`);
    seenFloors.add(key);
  }
  for (const wall of doc.walls) {
    if (!isEdgeInside(size, wall)) errors.push(`Parede fora do mapa em (${wall.x}, ${wall.z}).`);
  }
  const propIds = new Set<string>();
  for (const prop of doc.props) {
    if (prop.x > size.width || prop.z > size.depth)
      errors.push(`Objeto "${prop.id}" fora do mapa.`);
    if (propIds.has(prop.id)) errors.push(`Objeto repetido: "${prop.id}".`);
    propIds.add(prop.id);
  }
  return errors.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Arquivo de exportação (.rpgmap.json)
// ---------------------------------------------------------------------------

export type MapExportInput = {
  name: string;
  width: number;
  depth: number;
  document: MapDocument;
};

const exportEnvelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  exportedAt: z.string(),
  map: z.object({
    name: z.string().trim().min(1).max(80),
    width: z.number().int().min(1).max(MAX_MAP_SIZE),
    depth: z.number().int().min(1).max(MAX_MAP_SIZE),
    document: z.unknown(),
  }),
});

export function exportMap(map: MapExportInput, now: Date = new Date()): string {
  return JSON.stringify({ format: EXPORT_FORMAT, exportedAt: now.toISOString(), map });
}

export function importMap(text: string): MapResult<MapExportInput> {
  if (new TextEncoder().encode(text).length > MAX_EXPORT_BYTES) {
    return { ok: false, errors: ['O arquivo passa de 2 MB.'] };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['O arquivo não é um mapa do rpgmaps (JSON inválido).'] };
  }
  const envelope = exportEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return { ok: false, errors: ['O arquivo não é um mapa exportado pelo rpgmaps.'] };
  }
  const { name, width, depth, document } = envelope.data.map;
  const parsed = parseMapDocument(document, { width, depth });
  if (!parsed.ok) return parsed;
  return { ok: true, value: { name, width, depth, document: parsed.value } };
}
