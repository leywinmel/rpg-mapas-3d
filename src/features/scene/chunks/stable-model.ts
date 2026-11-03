/**
 * Enquanto o editor ainda edita o documento v1 (a troca é a F13), cada mudança vira uma
 * conversão nova para o v2, com todos os pedaços novos. Aqui o pedaço cujo conteúdo não
 * mudou volta a ser o objeto anterior: a cena compara pedaços pela referência e só
 * redesenha o que de fato mudou, como fará quando o editor operar direto no v2.
 */
import {
  chunkKey,
  type MapChunk,
  type MapModel,
  type MapPiece,
  type MapWall,
} from '@/domain/map-v2';

function sameArray<T>(a: ArrayLike<T>, b: ArrayLike<T>): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function sameWall(a: MapWall, b: MapWall): boolean {
  return (
    a.x === b.x &&
    a.z === b.z &&
    a.side === b.side &&
    a.style === b.style &&
    a.height === b.height &&
    a.level === b.level
  );
}

function sameAsset(a: MapPiece['asset'], b: MapPiece['asset']): boolean {
  if (a.source === 'catalog') return b.source === 'catalog' && a.key === b.key;
  return b.source === 'upload' && a.assetId === b.assetId;
}

function samePiece(a: MapPiece, b: MapPiece): boolean {
  return (
    a.id === b.id &&
    a.x === b.x &&
    a.z === b.z &&
    a.level === b.level &&
    a.rotation === b.rotation &&
    a.scale === b.scale &&
    a.footprint.width === b.footprint.width &&
    a.footprint.depth === b.footprint.depth &&
    sameAsset(a.asset, b.asset)
  );
}

function sameList<T>(a: readonly T[], b: readonly T[], same: (x: T, y: T) => boolean): boolean {
  return a.length === b.length && a.every((item, index) => same(item, b[index]!));
}

/** Mesmo conteúdo, campo a campo. Custa o tamanho do pedaço (1024 casas), nunca o do mapa. */
export function sameChunkContent(a: MapChunk, b: MapChunk): boolean {
  if (a === b) return true;
  return (
    a.bounds.x === b.bounds.x &&
    a.bounds.z === b.bounds.z &&
    a.bounds.width === b.bounds.width &&
    a.bounds.depth === b.bounds.depth &&
    sameArray(a.terrain.palette, b.terrain.palette) &&
    sameArray(a.terrain.tiles, b.terrain.tiles) &&
    sameArray(a.terrain.heights, b.terrain.heights) &&
    sameList(a.walls, b.walls, sameWall) &&
    sameList(a.pieces, b.pieces, samePiece)
  );
}

/**
 * O modelo novo, mas com os pedaços de conteúdo igual trocados pelos do modelo anterior. Se
 * nada mudou (nem o cabeçalho), devolve o próprio modelo anterior.
 */
export function reuseUnchangedChunks(previous: MapModel | null, next: MapModel): MapModel {
  if (!previous) return next;
  const chunks = new Map<string, MapChunk>();
  let changed = previous.chunks.size !== next.chunks.size;
  for (const chunk of next.chunks.values()) {
    const key = chunkKey(chunk.coord);
    const before = previous.chunks.get(key);
    const kept = before && sameChunkContent(before, chunk) ? before : chunk;
    if (kept !== before) changed = true;
    chunks.set(key, kept);
  }
  const sameHeader =
    previous.header === next.header ||
    JSON.stringify(previous.header) === JSON.stringify(next.header);
  const sameSize =
    previous.size.width === next.size.width && previous.size.depth === next.size.depth;
  if (!changed && sameHeader && sameSize) return previous;
  return { size: next.size, header: sameHeader ? previous.header : next.header, chunks };
}
