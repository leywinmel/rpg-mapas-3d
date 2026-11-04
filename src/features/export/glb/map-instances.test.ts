import { describe, expect, it } from 'vitest';
import {
  createEmptyMap,
  getChunk,
  NO_CUTAWAY,
  placePiece,
  placeWall,
  type MapModel,
} from '@/domain/map-v2';
import { makePiece, makeWall, unwrap } from '@/domain/map-v2/test-fixtures';
import { GLB_BASE_BYTES, GLB_BYTES_PER_FLOOR_CELL, GLB_BYTES_PER_OBJECT } from '../constants';
import { collectMapInstances, estimateGlbBytes } from './map-instances';

const CHUNK_CELLS = 32 * 32;

function sample(): MapModel {
  let model = createEmptyMap({ width: 64, depth: 32 });
  model = unwrap(placePiece(model, makePiece({ id: 'p1', x: 2, z: 2 })));
  model = unwrap(placePiece(model, makePiece({ id: 'p2', x: 40, z: 5 })));
  model = unwrap(placeWall(model, makeWall({ x: 3, z: 3 })));
  return model;
}

const chunksOf = (model: MapModel) => [
  getChunk(model, { cx: 0, cz: 0 }),
  getChunk(model, { cx: 1, cz: 0 }),
];

describe('collectMapInstances', () => {
  it('shouldJoinTheSamePieceAcrossChunks', () => {
    const model = sample();
    const instances = collectMapInstances(chunksOf(model), NO_CUTAWAY);

    expect(instances.columns.transforms).toHaveLength(2 * CHUNK_CELLS);
    expect(instances.columns.colors).toHaveLength(2 * CHUNK_CELLS);
    const pieceKey = makePiece({ id: 'x', x: 0, z: 0 }).asset;
    expect(pieceKey.source).toBe('catalog');
    if (pieceKey.source !== 'catalog') return;
    expect(instances.catalog.get(pieceKey.key)).toHaveLength(2);
    expect(instances.uploads.size).toBe(0);
  });
});

describe('estimateGlbBytes', () => {
  it('shouldGrowWithTheFloorWallsAndPieces', () => {
    const model = sample();
    const floors = 2 * CHUNK_CELLS;
    const objects = 1 + 2;

    expect(estimateGlbBytes(chunksOf(model))).toBe(
      GLB_BASE_BYTES + floors * GLB_BYTES_PER_FLOOR_CELL + objects * GLB_BYTES_PER_OBJECT,
    );
    expect(estimateGlbBytes([])).toBe(GLB_BASE_BYTES);
  });
});
