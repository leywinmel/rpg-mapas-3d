import { chunkKey } from './chunks';
import { DEFAULT_FLOOR_TILE } from './constants';
import { createEmptyMap, getChunk, terrainAt } from './model';
import { paintTerrainCell, placePiece, placeWall } from './operations';
import { resizeMap } from './resize';
import { setTerrainHeight } from './terrain-height';
import { errorsOf, makePiece, makeWall, unwrap } from './test-fixtures';
import type { MapModel } from './types';

// 70×40: pedaços de 32, 32 e 6 casas de largura; 32 e 8 de profundidade.
const base = createEmptyMap({ width: 70, depth: 40 });
const OTHER_FLOOR = 'piso-madeira';

function allPieces(model: MapModel) {
  return [...model.chunks.values()].flatMap((chunk) => chunk.pieces.map((piece) => piece.id));
}

function allWalls(model: MapModel) {
  return [...model.chunks.values()].flatMap((chunk) =>
    chunk.walls.map((wall) => `${chunkKey(chunk.coord)}:${wall.x},${wall.z},${wall.side}`),
  );
}

describe('resizing a map', () => {
  it('shouldReturnTheSameModelForTheSameSize', () => {
    expect(unwrap(resizeMap(base, { width: 70, depth: 40 }))).toBe(base);
  });

  it('shouldRejectSizesOutsideTheLimit', () => {
    for (const size of [
      { width: 0, depth: 10 },
      { width: 1001, depth: 10 },
      { width: 10.5, depth: 10 },
    ]) {
      expect(errorsOf(resizeMap(base, size))[0]).toMatch(/de 1 a 1000 casas/);
    }
  });

  it('shouldKeepUntouchedChunksAndDropTheOnesOutside', () => {
    const shrunk = unwrap(resizeMap(base, { width: 64, depth: 40 }));
    expect([...shrunk.chunks.keys()].sort()).toEqual(['0,0', '0,1', '1,0', '1,1']);
    for (const key of shrunk.chunks.keys())
      expect(shrunk.chunks.get(key)).toBe(base.chunks.get(key));
    expect(shrunk.size).toEqual({ width: 64, depth: 40 });
  });

  it('shouldCutTheBorderChunkAndKeepItsCells', () => {
    let model = unwrap(paintTerrainCell(base, { cell: { x: 66, z: 3 }, tile: OTHER_FLOOR }));
    model = unwrap(
      setTerrainHeight(model, { from: { x: 66, z: 3 }, to: { x: 66, z: 3 }, height: 5 }),
    );
    const shrunk = unwrap(resizeMap(model, { width: 67, depth: 40 }));
    expect(getChunk(shrunk, { cx: 2, cz: 0 }).bounds).toEqual({ x: 64, z: 0, width: 3, depth: 32 });
    expect(terrainAt(shrunk, { x: 66, z: 3 })).toEqual({ tile: OTHER_FLOOR, height: 5 });
    expect(terrainAt(shrunk, { x: 67, z: 3 })).toBeNull();
  });

  it('shouldOpenPlainFloorWhenGrowing', () => {
    const hole = unwrap(paintTerrainCell(base, { cell: { x: 69, z: 39 }, tile: null }));
    const grown = unwrap(resizeMap(hole, { width: 100, depth: 80 }));
    expect(terrainAt(grown, { x: 69, z: 39 })).toEqual({ tile: null, height: 0 });
    expect(terrainAt(grown, { x: 70, z: 39 })).toEqual({ tile: DEFAULT_FLOOR_TILE, height: 0 });
    expect(terrainAt(grown, { x: 99, z: 79 })).toEqual({ tile: DEFAULT_FLOOR_TILE, height: 0 });
    expect(grown.chunks.size).toBe(4 * 3);
  });

  it('shouldDropPiecesThatNoLongerFitWhole', () => {
    let model = unwrap(placePiece(base, makePiece({ id: 'dentro', x: 10, z: 10 })));
    model = unwrap(
      placePiece(model, makePiece({ id: 'carro', x: 60, z: 5, footprint: { width: 4, depth: 2 } })),
    );
    model = unwrap(placePiece(model, makePiece({ id: 'fora', x: 68, z: 5 })));
    const shrunk = unwrap(resizeMap(model, { width: 63, depth: 40 }));
    expect(allPieces(shrunk)).toEqual(['dentro']);
  });

  it('shouldDropWallsOutsideAndMoveBorderWallsToTheirNewChunk', () => {
    // Borda leste de um mapa de 64: a aresta x = 64 é da casa (63, z), no pedaço (1, 0).
    let model = unwrap(resizeMap(base, { width: 64, depth: 40 }));
    model = unwrap(placeWall(model, makeWall({ x: 64, z: 5, side: 'west' })));
    model = unwrap(placeWall(model, makeWall({ x: 10, z: 5, side: 'west' })));
    expect(allWalls(model)).toEqual(['0,0:10,5,west', '1,0:64,5,west']);
    // Ao crescer, a mesma aresta passa a ser da casa (64, z), no pedaço novo (2, 0).
    const grown = unwrap(resizeMap(model, { width: 70, depth: 40 }));
    expect(allWalls(grown).sort()).toEqual(['0,0:10,5,west', '2,0:64,5,west']);
    // Ao diminuir para 10, a parede da borda nova (x = 10) fica; a de x = 64 some.
    const small = unwrap(resizeMap(grown, { width: 10, depth: 40 }));
    expect(allWalls(small)).toEqual(['0,0:10,5,west']);
  });
});
