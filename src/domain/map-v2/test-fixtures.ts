/** Fábricas de peças e paredes para os testes do v2. Não entra no index.ts: só os testes importam. */
import type { MapResult } from '../map-document';
import { changedChunks } from './model';
import { chunkKey } from './chunks';
import type { MapPiece, MapWall } from './schema';
import type { MapChunk, MapModel } from './types';

export function makePiece(overrides: Partial<MapPiece> = {}): MapPiece {
  return {
    id: 'barril-1',
    asset: { source: 'catalog', key: 'barril' },
    x: 3,
    z: 4,
    level: 0,
    rotation: 0,
    footprint: { width: 1, depth: 1 },
    scale: 1,
    ...overrides,
  };
}

export function makeWall(overrides: Partial<MapWall> = {}): MapWall {
  return { x: 1, z: 1, side: 'north', style: 'parede-pedra', height: 8, level: 0, ...overrides };
}

/** Valor de um resultado que o teste espera que tenha dado certo. */
export function unwrap<T>(result: MapResult<T>): T {
  if (!result.ok) throw new Error(`Resultado inesperado: ${result.errors.join(' | ')}`);
  return result.value;
}

export function errorsOf<T>(result: MapResult<T>): string[] {
  return result.ok ? [] : result.errors;
}

/** Chaves dos pedaços que mudaram de um modelo para o outro, em ordem. */
export function changedKeys(before: MapModel, after: MapModel): string[] {
  return changedChunks(before, after).map(chunkKey);
}

/** Troca um pedaço do modelo sem passar pelas operações (monta cenários prontos). */
export function withChunk(model: MapModel, chunk: MapChunk): MapModel {
  const chunks = new Map(model.chunks);
  chunks.set(chunkKey(chunk.coord), chunk);
  return { ...model, chunks };
}
