/**
 * Do banco para a memória e de volta. O cabeçalho vai para maps.document e cada pedaço para uma
 * linha própria; o tamanho do mapa fica nas colunas width e depth, e é passado a parte.
 *
 * Só os pedaços mexidos têm linha (decisão 14 do usuário, em 03/11): o que nunca foi editado vale
 * como o chão liso padrão. Assim criar um mapa de 1000×1000 é instantâneo e um mapa quase vazio
 * ocupa quase nada no banco gratuito.
 */
import type { GridSize } from '../grid';
import type { MapResult } from '../map-document';
import { chunkKey, isValidMapSizeV2, listChunks, type ChunkCoord } from './chunks';
import { MAX_MAP_SIZE_V2, MAX_REPORTED_ERRORS } from './constants';
import { chunkLabel, parseChunk, parseMapHeader, serializeChunk } from './document';
import { changedChunks, createUniformChunk, getChunk, isDefaultChunk } from './model';
import type { ChunkDocument, MapHeader } from './schema';
import type { MapChunk, MapModel } from './types';
import { fail, ok } from './validation';

/** Um pedaço como veio do banco: a linha diz onde ele está, o documento diz o que tem. */
export type StoredChunk = { readonly coord: ChunkCoord; readonly document: unknown };

export type StoredMap = {
  readonly size: GridSize;
  readonly header: unknown;
  /** Só os pedaços que têm linha; os que faltam são o chão liso padrão. */
  readonly chunks: Iterable<StoredChunk>;
};

export type SerializedChunk = { readonly coord: ChunkCoord; readonly document: ChunkDocument };

export type SerializedMap = {
  readonly header: MapHeader;
  /** Só os pedaços diferentes do chão liso padrão. */
  readonly chunks: SerializedChunk[];
};

/** O que uma gravação precisa mandar ao banco para ele ficar igual ao mapa em memória. */
export type MapSavePlan = {
  readonly header: MapHeader;
  readonly headerChanged: boolean;
  /** Pedaços mexidos que continuam diferentes do padrão: gravar (inserir ou trocar). */
  readonly upserts: SerializedChunk[];
  /** Pedaços mexidos que voltaram a ser o chão liso padrão: apagar a linha. */
  readonly deletes: ChunkCoord[];
};

/** O id de peça é único no mapa inteiro, e cada pedaço só enxerga as peças dele. */
function repeatedPieceError(chunks: ReadonlyMap<string, MapChunk>): string | null {
  const owners = new Map<string, ChunkCoord>();
  for (const chunk of chunks.values()) {
    for (const piece of chunk.pieces) {
      const other = owners.get(piece.id);
      if (other) {
        return (
          `A peça "${piece.id}" aparece em dois pedaços: ` +
          `(${other.cx}, ${other.cz}) e (${chunk.coord.cx}, ${chunk.coord.cz}).`
        );
      }
      owners.set(piece.id, chunk.coord);
    }
  }
  return null;
}

/** Os pedaços sem linha no banco viram o chão liso padrão. */
function fillMissingChunks(size: GridSize, chunks: Map<string, MapChunk>): void {
  for (const coord of listChunks(size)) {
    const key = chunkKey(coord);
    if (!chunks.has(key)) chunks.set(key, createUniformChunk(size, coord));
  }
}

/**
 * Monta o mapa a partir do cabeçalho e dos pedaços gravados. Confere cada documento, que nenhum
 * pedaço vem repetido nem fora do mapa e que nenhum id de peça se repete entre pedaços. Pedaço
 * que falta não é erro: vale como o chão liso padrão.
 */
export function loadMapModel(stored: StoredMap): MapResult<MapModel> {
  const { size } = stored;
  if (!isValidMapSizeV2(size)) {
    return fail([
      `Tamanho ${size.width}×${size.depth} inválido: use de 1 a ${MAX_MAP_SIZE_V2} casas por lado.`,
    ]);
  }
  const header = parseMapHeader(stored.header);
  if (!header.ok) return header;

  const errors: string[] = [];
  const chunks = new Map<string, MapChunk>();
  for (const { coord, document } of stored.chunks) {
    if (errors.length >= MAX_REPORTED_ERRORS) break;
    if (chunks.has(chunkKey(coord))) {
      errors.push(`${chunkLabel(coord)}: veio repetido.`);
      continue;
    }
    const parsed = parseChunk(document, { size, coord });
    if (!parsed.ok) errors.push(...parsed.errors);
    else chunks.set(chunkKey(coord), parsed.value);
  }
  if (errors.length > 0) return fail(errors);

  const problem = repeatedPieceError(chunks);
  if (problem) return fail([problem]);
  fillMissingChunks(size, chunks);
  return ok({ size: { width: size.width, depth: size.depth }, header: header.value, chunks });
}

function serializeStored(chunk: MapChunk): SerializedChunk {
  return { coord: chunk.coord, document: serializeChunk(chunk) };
}

/**
 * Cabeçalho e documentos de todos os pedaços que precisam de linha (os diferentes do padrão).
 * É a gravação inteira, de um mapa que ainda não está no banco; para gravar só o que mudou,
 * use planMapSave.
 */
export function serializeMapModel(model: MapModel): SerializedMap {
  const chunks: SerializedChunk[] = [];
  for (const chunk of model.chunks.values()) {
    if (!isDefaultChunk(chunk)) chunks.push(serializeStored(chunk));
  }
  return { header: model.header, chunks };
}

/**
 * O que gravar para o banco, que hoje guarda `saved`, passar a guardar `current`. Com `saved`
 * nulo o banco ainda não tem o mapa no v2 (mapa novo ou ainda no v1): vai tudo o que foge do
 * padrão. Senão, só os pedaços trocados (por referência, como em changedChunks), e o pedaço
 * trocado que voltou a ser liso é apagado. O cabeçalho também é comparado por referência.
 *
 * Os dois modelos precisam ter o mesmo tamanho: mudar o tamanho é outra conta (o banco guarda o
 * tamanho em maps.width e maps.depth), e pedir isso aqui é erro de programação.
 */
export function planMapSave(saved: MapModel | null, current: MapModel): MapSavePlan {
  if (!saved) {
    const { header, chunks } = serializeMapModel(current);
    return { header, headerChanged: true, upserts: chunks, deletes: [] };
  }
  if (saved.size.width !== current.size.width || saved.size.depth !== current.size.depth) {
    throw new RangeError(
      `O mapa mudou de ${saved.size.width}×${saved.size.depth} para ` +
        `${current.size.width}×${current.size.depth}: a gravação por pedaços não troca o tamanho.`,
    );
  }
  const upserts: SerializedChunk[] = [];
  const deletes: ChunkCoord[] = [];
  for (const coord of changedChunks(saved, current)) {
    const chunk = getChunk(current, coord);
    if (isDefaultChunk(chunk)) deletes.push(coord);
    else upserts.push(serializeStored(chunk));
  }
  return {
    header: current.header,
    headerChanged: saved.header !== current.header,
    upserts,
    deletes,
  };
}

/** Nada a gravar: nem pedaço nem cabeçalho mudaram. */
export function isEmptySavePlan(plan: MapSavePlan): boolean {
  return !plan.headerChanged && plan.upserts.length === 0 && plan.deletes.length === 0;
}
