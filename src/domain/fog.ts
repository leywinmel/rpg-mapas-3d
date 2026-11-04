/**
 * Névoa de guerra em pedaços de 32×32 casas, alinhados aos pedaços do mapa v2. Só os pedaços
 * que o mestre mexeu existem; o pedaço ausente vale o padrão do mapa (tudo coberto ou tudo à
 * vista). Assim um mapa de 1000×1000 todo coberto é uma linha no banco, e uma pincelada regrava
 * só os pedaços que tocou.
 *
 * Convenção igual à do banco (map_fog_chunks.covered, bit(1024)): a casa (x, z) é o bit
 * (z local · 32 + x local) do pedaço, sempre com linhas de 32 casas, mesmo no pedaço cortado da
 * borda. Os bits de fora do mapa ficam 0.
 */
import type { Cell, GridSize } from './grid';
import { chunkBounds, chunkKey, chunkOfCell, chunksTouchedByRect } from './map-v2/chunks';
import { CHUNK_CELLS, CHUNK_SIZE } from './map-v2/constants';
import { intersectRects, mapRect, type CellRect } from './map-v2/rect';
import type { ChunkCoord } from './map-v2/chunks';

/** 1 = coberta, 0 = à vista; CHUNK_CELLS posições. Imutável por convenção, como os pedaços do mapa. */
export type FogChunk = Uint8Array;

export type FogState = {
  readonly size: GridSize;
  /** Desligada, a névoa não esconde nada (nem para o jogador). */
  readonly enabled: boolean;
  /** Vale para os pedaços sem entrada em `chunks`. */
  readonly defaultCovered: boolean;
  /** Pedaços pela chave de chunkKey(). Referência igual quer dizer "não mudou". */
  readonly chunks: ReadonlyMap<string, FogChunk>;
};

export const FOG_COVERED = 1;
export const FOG_CLEAR = 0;

export function createFogState(size: GridSize, enabled = false, defaultCovered = false): FogState {
  return { size, enabled, defaultCovered, chunks: new Map() };
}

function bitIndex(bounds: CellRect, cell: Cell): number {
  return (cell.z - bounds.z) * CHUNK_SIZE + (cell.x - bounds.x);
}

function isInsideMap(size: GridSize, cell: Cell): boolean {
  return cell.x >= 0 && cell.z >= 0 && cell.x < size.width && cell.z < size.depth;
}

/** Pedaço inteiro no valor padrão, só nas casas que existem. */
function uniformChunk(size: GridSize, coord: ChunkCoord, covered: boolean): FogChunk {
  const bits = new Uint8Array(CHUNK_CELLS);
  if (!covered) return bits;
  const bounds = chunkBounds(size, coord);
  for (let z = 0; z < bounds.depth; z += 1) {
    bits.fill(FOG_COVERED, z * CHUNK_SIZE, z * CHUNK_SIZE + bounds.width);
  }
  return bits;
}

/**
 * Casa coberta para quem joga. Fora do mapa conta como coberta (a mesma regra do banco); com a
 * névoa desligada nada está coberto.
 */
export function isCellCovered(fog: FogState, cell: Cell): boolean {
  if (!isInsideMap(fog.size, cell)) return true;
  if (!fog.enabled) return false;
  const coord = chunkOfCell(cell);
  const chunk = fog.chunks.get(chunkKey(coord));
  if (!chunk) return fog.defaultCovered;
  return chunk[bitIndex(chunkBounds(fog.size, coord), cell)] === FOG_COVERED;
}

/** Área quadrada toda coberta? Uma casa à vista já mostra o token (igual a is_area_covered). */
export function isAreaCovered(fog: FogState, anchor: Cell, side: number): boolean {
  for (let dz = 0; dz < side; dz += 1) {
    for (let dx = 0; dx < side; dx += 1) {
      if (!isCellCovered(fog, { x: anchor.x + dx, z: anchor.z + dz })) return false;
    }
  }
  return true;
}

/** O pedaço está todo no padrão? Então não precisa de linha no banco. */
function matchesDefault(size: GridSize, coord: ChunkCoord, chunk: FogChunk, covered: boolean) {
  const bounds = chunkBounds(size, coord);
  const expected = covered ? FOG_COVERED : FOG_CLEAR;
  for (let z = 0; z < bounds.depth; z += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      if (chunk[z * CHUNK_SIZE + x] !== expected) return false;
    }
  }
  return true;
}

/**
 * Cobre (true) ou revela (false) o retângulo. Devolve uma névoa nova e troca só os pedaços que
 * o retângulo toca; o pedaço que volta ao padrão sai da lista.
 */
export function paintFogRect(fog: FogState, rect: CellRect, covered: boolean): FogState {
  const clipped = intersectRects(mapRect(fog.size), rect);
  if (!clipped) return fog;
  const value = covered ? FOG_COVERED : FOG_CLEAR;
  const chunks = new Map(fog.chunks);
  let changed = false;
  for (const coord of chunksTouchedByRect(fog.size, clipped)) {
    const key = chunkKey(coord);
    const bounds = chunkBounds(fog.size, coord);
    const area = intersectRects(bounds, clipped);
    if (!area) continue;
    const before = chunks.get(key) ?? uniformChunk(fog.size, coord, fog.defaultCovered);
    const after = before.slice();
    for (let z = area.z; z < area.z + area.depth; z += 1) {
      const start = bitIndex(bounds, { x: area.x, z });
      after.fill(value, start, start + area.width);
    }
    if (after.every((bit, index) => bit === before[index])) continue;
    changed = true;
    if (matchesDefault(fog.size, coord, after, fog.defaultCovered)) chunks.delete(key);
    else chunks.set(key, after);
  }
  return changed ? { ...fog, chunks } : fog;
}

/** Cobre ou revela o mapa inteiro: troca o padrão e esquece os pedaços. */
export function fillFog(fog: FogState, covered: boolean): FogState {
  return { ...fog, defaultCovered: covered, chunks: new Map() };
}

export function setFogEnabled(fog: FogState, enabled: boolean): FogState {
  return enabled === fog.enabled ? fog : { ...fog, enabled };
}

/** Texto "0101…" de 1024 posições, o formato que o Postgres aceita e devolve para bit(1024). */
export function fogChunkToText(chunk: FogChunk): string {
  return Array.from(chunk, (bit) => (bit === FOG_COVERED ? '1' : '0')).join('');
}

export function fogChunkFromText(text: string): FogChunk | null {
  if (text.length !== CHUNK_CELLS || /[^01]/.test(text)) return null;
  return Uint8Array.from(text, (char) => (char === '1' ? FOG_COVERED : FOG_CLEAR));
}

export type FogSavePlan = {
  readonly enabled: boolean;
  readonly defaultCovered: boolean;
  /** Apaga todos os pedaços antes de gravar (o padrão mudou). */
  readonly reset: boolean;
  readonly upserts: ReadonlyArray<{ coord: ChunkCoord; covered: string }>;
  readonly deletes: readonly ChunkCoord[];
};

function coordFromKey(key: string): ChunkCoord {
  const [cx, cz] = key.split(',').map(Number);
  return { cx: cx ?? 0, cz: cz ?? 0 };
}

/**
 * O que gravar para o banco passar de `saved` (null = nada gravado ainda) para `current`. Com o
 * padrão trocado o plano recomeça do zero; senão vão só os pedaços de referência diferente.
 */
export function planFogSave(saved: FogState | null, current: FogState): FogSavePlan {
  const reset = !saved || saved.defaultCovered !== current.defaultCovered;
  const upserts: Array<{ coord: ChunkCoord; covered: string }> = [];
  for (const [key, chunk] of current.chunks) {
    if (!reset && saved.chunks.get(key) === chunk) continue;
    upserts.push({ coord: coordFromKey(key), covered: fogChunkToText(chunk) });
  }
  const deletes = reset
    ? []
    : [...saved.chunks.keys()].filter((key) => !current.chunks.has(key)).map(coordFromKey);
  return {
    enabled: current.enabled,
    defaultCovered: current.defaultCovered,
    reset,
    upserts,
    deletes,
  };
}

export function isEmptyFogPlan(saved: FogState | null, plan: FogSavePlan): boolean {
  return (
    saved !== null &&
    !plan.reset &&
    plan.enabled === saved.enabled &&
    plan.upserts.length === 0 &&
    plan.deletes.length === 0
  );
}

/** Quadrado do pincel: a casa do cursor e `radius` casas para cada lado. */
export function brushRect(center: Cell, radius: number): CellRect {
  return {
    x: center.x - radius,
    z: center.z - radius,
    width: radius * 2 + 1,
    depth: radius * 2 + 1,
  };
}
