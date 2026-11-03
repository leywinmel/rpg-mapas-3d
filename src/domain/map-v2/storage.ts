/**
 * Do banco para a memória e de volta. O cabeçalho vai para maps.document e cada pedaço para uma
 * linha própria; o tamanho do mapa fica nas colunas width e depth, e é passado a parte.
 */
import type { GridSize } from '../grid';
import type { MapResult } from '../map-document';
import { chunkKey, isValidMapSizeV2, listChunks, type ChunkCoord } from './chunks';
import { MAX_MAP_SIZE_V2, MAX_REPORTED_ERRORS } from './constants';
import { chunkLabel, parseChunk, parseMapHeader, serializeChunk } from './document';
import type { ChunkDocument, MapHeader } from './schema';
import type { MapChunk, MapModel } from './types';
import { fail, ok } from './validation';

/** Um pedaço como veio do banco: a linha diz onde ele está, o documento diz o que tem. */
export type StoredChunk = { readonly coord: ChunkCoord; readonly document: unknown };

export type StoredMap = {
  readonly size: GridSize;
  readonly header: unknown;
  readonly chunks: Iterable<StoredChunk>;
};

export type SerializedMap = {
  readonly header: MapHeader;
  readonly chunks: Array<{ readonly coord: ChunkCoord; readonly document: ChunkDocument }>;
};

function missingChunksError(size: GridSize, found: ReadonlyMap<string, MapChunk>): string | null {
  const missing = listChunks(size).filter((coord) => !found.has(chunkKey(coord)));
  const first = missing[0];
  if (!first) return null;
  const how = missing.length === 1 ? 'Falta 1 pedaço' : `Faltam ${missing.length} pedaços`;
  return `${how} do mapa, a começar pelo (${first.cx}, ${first.cz}).`;
}

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

/**
 * Monta o mapa a partir do cabeçalho e dos pedaços gravados. Confere cada documento, que todos
 * os pedaços do tamanho do mapa estão presentes (um pedaço que falta seria um buraco calado) e
 * que nenhum id de peça se repete entre pedaços.
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

  const problem = missingChunksError(size, chunks) ?? repeatedPieceError(chunks);
  if (problem) return fail([problem]);
  return ok({ size: { width: size.width, depth: size.depth }, header: header.value, chunks });
}

/** Cabeçalho e documentos de todos os pedaços. Para gravar só o que mudou, use changedChunks. */
export function serializeMapModel(model: MapModel): SerializedMap {
  return {
    header: model.header,
    chunks: [...model.chunks.values()].map((chunk) => ({
      coord: chunk.coord,
      document: serializeChunk(chunk),
    })),
  };
}
