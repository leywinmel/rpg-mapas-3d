/**
 * Leitura e gravação dos documentos do v2: o cabeçalho (vai para maps.document) e um documento
 * por pedaço. A leitura confere o que o schema não alcança, porque depende do mapa: o terreno
 * fecha a conta das casas, e paredes e peças estão no pedaço certo.
 */
import { isEdgeInside, type GridSize } from '../grid';
import type { MapResult } from '../map-document';
import { chunkBounds, isChunkInside, type ChunkCoord } from './chunks';
import { MAP_V2_VERSION, MAX_REPORTED_ERRORS } from './constants';
import { pieceFitsInMap, rotatedFootprint } from './footprint';
import { rectContains, type CellRect } from './rect';
import {
  chunkDocumentSchema,
  mapHeaderSchema,
  type ChunkDocument,
  type MapHeader,
  type MapPiece,
  type MapWall,
} from './schema';
import { decodeTerrain, encodeTerrain } from './terrain';
import type { MapChunk } from './types';
import { fail, ok, parseWithSchema } from './validation';
import { wallKey, wallOwnerChunk } from './walls';

/** Qual pedaço e de que mapa: a leitura precisa dos dois, o documento não repete nenhum. */
export type ChunkContext = { readonly size: GridSize; readonly coord: ChunkCoord };

export function chunkLabel(coord: ChunkCoord): string {
  return `Pedaço (${coord.cx}, ${coord.cz})`;
}

/** Mensagem se o documento não é da versão 2, ou null. Roda antes do schema para a mensagem ser clara. */
function versionProblem(input: unknown): string | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return 'O mapa não está num formato reconhecido.';
  }
  const { version } = input as { version?: unknown };
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return 'O mapa não informa a versão do formato.';
  }
  if (version > MAP_V2_VERSION) return 'Este mapa foi feito numa versão mais nova do rpgmaps.';
  if (version < MAP_V2_VERSION) {
    return `Este mapa está no formato antigo (versão ${version}) e precisa ser convertido para a versão ${MAP_V2_VERSION}.`;
  }
  return null;
}

export function parseMapHeader(input: unknown): MapResult<MapHeader> {
  const problem = versionProblem(input);
  if (problem) return fail([problem]);
  return parseWithSchema(mapHeaderSchema, input);
}

function checkWalls(walls: readonly MapWall[], { size, coord }: ChunkContext): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const wall of walls) {
    if (errors.length >= MAX_REPORTED_ERRORS) break;
    if (!isEdgeInside(size, wall)) {
      errors.push(`Parede fora do mapa em (${wall.x}, ${wall.z}).`);
      continue;
    }
    const owner = wallOwnerChunk(size, wall);
    if (owner.cx !== coord.cx || owner.cz !== coord.cz) {
      errors.push(`A parede em (${wall.x}, ${wall.z}) é de outro pedaço.`);
      continue;
    }
    const key = wallKey(wall);
    if (seen.has(key)) {
      errors.push(
        `Duas paredes iguais em (${wall.x}, ${wall.z}), lado ${wall.side}, no mesmo degrau.`,
      );
    }
    seen.add(key);
  }
  return errors;
}

function checkPieces(pieces: readonly MapPiece[], size: GridSize, bounds: CellRect): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const piece of pieces) {
    if (errors.length >= MAX_REPORTED_ERRORS) break;
    if (!rectContains(bounds, piece)) {
      errors.push(`A peça "${piece.id}" tem a âncora fora deste pedaço.`);
    } else if (!pieceFitsInMap(size, piece)) {
      // Girar uma peça que cabia pode fazê-la passar da borda do mapa.
      const { width, depth } = rotatedFootprint(piece.footprint, piece.rotation);
      errors.push(
        `A peça "${piece.id}" não cabe no mapa: ocupa ${width}×${depth} casas a partir de (${piece.x}, ${piece.z}).`,
      );
    }
    if (ids.has(piece.id)) errors.push(`Peça repetida: "${piece.id}".`);
    ids.add(piece.id);
  }
  return errors;
}

/**
 * Lê o documento de um pedaço. As mensagens citam o pedaço, para quem abre um mapa de
 * mil pedaços achar o que está errado. O id de uma peça só é conferido contra as do
 * mesmo pedaço; repetido entre pedaços quem confere é loadMapModel.
 */
export function parseChunk(input: unknown, context: ChunkContext): MapResult<MapChunk> {
  const { size, coord } = context;
  const label = chunkLabel(coord);
  const withLabel = (errors: readonly string[]) =>
    fail(errors.map((error) => `${label}: ${error}`));

  if (!isChunkInside(size, coord)) {
    return fail([`${label}: não existe no mapa de ${size.width}×${size.depth} casas.`]);
  }
  const problem = versionProblem(input);
  if (problem) return withLabel([problem]);
  const parsed = parseWithSchema(chunkDocumentSchema, input);
  if (!parsed.ok) return withLabel(parsed.errors);

  const bounds = chunkBounds(size, coord);
  const terrain = decodeTerrain(parsed.value.terrain, bounds);
  if (!terrain.ok) return withLabel(terrain.errors);

  const { walls, pieces } = parsed.value;
  const errors = [...checkWalls(walls, context), ...checkPieces(pieces, size, bounds)];
  if (errors.length > 0) return withLabel(errors);
  return ok({ coord, bounds, terrain: terrain.value, walls, pieces });
}

/** Documento do pedaço para gravar: o terreno vira paleta mais corridas, o resto segue igual. */
export function serializeChunk(chunk: MapChunk): ChunkDocument {
  return {
    version: MAP_V2_VERSION,
    terrain: encodeTerrain(chunk.terrain),
    walls: [...chunk.walls],
    pieces: [...chunk.pieces],
  };
}
