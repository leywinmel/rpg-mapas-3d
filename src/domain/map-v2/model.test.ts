import { chunkKey, listChunks } from './chunks';
import { CHUNK_CELLS, DEFAULT_FLOOR_TILE, MAP_V2_VERSION } from './constants';
import { serializeChunk } from './document';
import {
  chunkAtCell,
  createEmptyMap,
  createUniformChunk,
  getChunk,
  isDefaultChunk,
  terrainAt,
} from './model';
import { paintTerrainRect, placePiece, placeWall } from './operations';
import { setTerrainHeight } from './terrain-height';
import { makePiece, makeWall, unwrap } from './test-fixtures';

describe('empty map', () => {
  it('shouldCreateAMapWithEveryChunkAndTheDefaultAmbience', () => {
    const map = createEmptyMap({ width: 70, depth: 40 });
    expect(map.size).toEqual({ width: 70, depth: 40 });
    expect(map.header.version).toBe(MAP_V2_VERSION);
    expect(map.header.ambience.preset).toBe('masmorra');
    expect(map.chunks.size).toBe(6);
    for (const chunk of map.chunks.values()) {
      expect(chunk.walls).toEqual([]);
      expect(chunk.pieces).toEqual([]);
    }
  });

  it('shouldFillEveryCellWithTheChosenFloorAtLevelZero', () => {
    const map = createEmptyMap({ width: 70, depth: 40 }, 'piso-madeira');
    expect(terrainAt(map, { x: 0, z: 0 })).toEqual({ tile: 'piso-madeira', height: 0 });
    expect(terrainAt(map, { x: 69, z: 39 })).toEqual({ tile: 'piso-madeira', height: 0 });
  });

  it('shouldHandleTheLargestMapWithBorderChunksCut', () => {
    const map = createEmptyMap({ width: 1000, depth: 1000 });
    expect(map.chunks.size).toBe(1024);
    expect(getChunk(map, { cx: 0, cz: 0 }).terrain.tiles).toHaveLength(CHUNK_CELLS);
    expect(getChunk(map, { cx: 31, cz: 0 }).terrain.tiles).toHaveLength(8 * 32);
    expect(getChunk(map, { cx: 31, cz: 31 }).terrain.tiles).toHaveLength(8 * 8);
    expect(terrainAt(map, { x: 999, z: 999 })).toEqual({ tile: 'piso-pedra', height: 0 });
  });

  it('shouldSerializeTheLargestMapInAFewHundredKilobytes', () => {
    // O v1 gravava uma linha de ~45 bytes por casa: um milhão de casas seriam ~45 MB.
    const map = createEmptyMap({ width: 1000, depth: 1000 });
    const documents = listChunks(map.size).map((coord) => serializeChunk(getChunk(map, coord)));
    const bytes = JSON.stringify(documents).length;
    expect(bytes).toBeLessThan(200_000);
    expect(documents[0]?.terrain.tiles).toEqual([1, 1024]);
  });

  it('shouldRejectInvalidSizesAndTiles', () => {
    expect(() => createEmptyMap({ width: 0, depth: 10 })).toThrow(RangeError);
    expect(() => createEmptyMap({ width: 1001, depth: 10 })).toThrow(RangeError);
    expect(() => createEmptyMap({ width: 4.5, depth: 10 })).toThrow(RangeError);
    expect(() => createEmptyMap({ width: 4, depth: 4 }, '../../etc')).toThrow(
      /Peça de chão inválida/,
    );
  });

  it('shouldFindChunksAndCellsOnlyInsideTheMap', () => {
    const map = createEmptyMap({ width: 70, depth: 40 });
    expect(chunkAtCell(map, { x: 40, z: 35 })?.coord).toEqual({ cx: 1, cz: 1 });
    expect(chunkAtCell(map, { x: 70, z: 0 })).toBeUndefined();
    expect(terrainAt(map, { x: -1, z: 0 })).toBeNull();
    expect(map.chunks.get(chunkKey({ cx: 2, cz: 1 }))).toBe(getChunk(map, { cx: 2, cz: 1 }));
    expect(() => getChunk(map, { cx: 3, cz: 0 })).toThrow(RangeError);
  });
});

describe('default chunk', () => {
  const size = { width: 40, depth: 40 };
  const corner = { cx: 0, cz: 0 };
  const touched = (model: ReturnType<typeof createEmptyMap>) => getChunk(model, corner);

  it('shouldTreatTheUntouchedChunkAsDefault', () => {
    expect(isDefaultChunk(createUniformChunk(size, corner))).toBe(true);
    expect(isDefaultChunk(createUniformChunk(size, { cx: 1, cz: 1 }))).toBe(true);
    expect(isDefaultChunk(createUniformChunk(size, corner, 'piso-madeira'))).toBe(false);
  });

  it('shouldNoticeAnyVisibleChange', () => {
    const empty = createEmptyMap(size);
    const floor = { from: { x: 1, z: 1 }, to: { x: 1, z: 1 } };
    expect(isDefaultChunk(touched(unwrap(paintTerrainRect(empty, { ...floor, tile: null }))))).toBe(
      false,
    );
    expect(isDefaultChunk(touched(unwrap(setTerrainHeight(empty, { ...floor, height: 1 }))))).toBe(
      false,
    );
    expect(isDefaultChunk(touched(unwrap(placeWall(empty, makeWall()))))).toBe(false);
    expect(isDefaultChunk(touched(unwrap(placePiece(empty, makePiece()))))).toBe(false);
  });

  it('shouldCountAChunkPaintedBackAsDefault', () => {
    const floor = { from: { x: 1, z: 1 }, to: { x: 3, z: 3 } };
    let model = unwrap(paintTerrainRect(createEmptyMap(size), { ...floor, tile: 'piso-madeira' }));
    model = unwrap(paintTerrainRect(model, { ...floor, tile: DEFAULT_FLOOR_TILE }));
    expect(isDefaultChunk(touched(model))).toBe(true);
  });
});
