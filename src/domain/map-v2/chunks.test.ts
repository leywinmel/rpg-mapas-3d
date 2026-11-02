import {
  chunkBounds,
  chunkGridSize,
  chunkKey,
  chunkOfCell,
  chunksTouchedByRect,
  isChunkInside,
  isValidMapSizeV2,
  listChunks,
  localIndex,
} from './chunks';

const big = { width: 1000, depth: 1000 };

describe('chunks', () => {
  it('shouldAcceptMapsUpTo1000By1000', () => {
    expect(isValidMapSizeV2({ width: 1000, depth: 1000 })).toBe(true);
    expect(isValidMapSizeV2({ width: 1, depth: 1 })).toBe(true);
    expect(isValidMapSizeV2({ width: 1001, depth: 10 })).toBe(false);
    expect(isValidMapSizeV2({ width: 10, depth: 0 })).toBe(false);
    expect(isValidMapSizeV2({ width: 2.5, depth: 10 })).toBe(false);
  });

  it('shouldFindTheChunkOfACell', () => {
    expect(chunkOfCell({ x: 0, z: 0 })).toEqual({ cx: 0, cz: 0 });
    expect(chunkOfCell({ x: 31, z: 31 })).toEqual({ cx: 0, cz: 0 });
    expect(chunkOfCell({ x: 32, z: 31 })).toEqual({ cx: 1, cz: 0 });
    expect(chunkOfCell({ x: 999, z: 999 })).toEqual({ cx: 31, cz: 31 });
  });

  it('shouldCountChunksAndCutTheOnesOnTheBorder', () => {
    expect(chunkGridSize(big)).toEqual({ columns: 32, rows: 32 });
    expect(listChunks(big)).toHaveLength(1024);
    expect(chunkBounds(big, { cx: 0, cz: 0 })).toEqual({ x: 0, z: 0, width: 32, depth: 32 });
    // 1000 = 31·32 + 8: os pedaços da última coluna e da última linha são menores.
    expect(chunkBounds(big, { cx: 31, cz: 30 })).toEqual({ x: 992, z: 960, width: 8, depth: 32 });
    expect(chunkBounds(big, { cx: 31, cz: 31 })).toEqual({ x: 992, z: 992, width: 8, depth: 8 });
  });

  it('shouldNotCreateAnExtraChunkWhenTheSideIsAMultipleOf32', () => {
    const size = { width: 64, depth: 32 };
    expect(chunkGridSize(size)).toEqual({ columns: 2, rows: 1 });
    expect(chunkBounds(size, { cx: 1, cz: 0 })).toEqual({ x: 32, z: 0, width: 32, depth: 32 });
    expect(isChunkInside(size, { cx: 2, cz: 0 })).toBe(false);
  });

  it('shouldGiveATinyMapASingleChunk', () => {
    expect(listChunks({ width: 1, depth: 1 })).toEqual([{ cx: 0, cz: 0 }]);
    expect(chunkBounds({ width: 1, depth: 1 }, { cx: 0, cz: 0 })).toEqual({
      x: 0,
      z: 0,
      width: 1,
      depth: 1,
    });
  });

  it('shouldListChunksRowByRow', () => {
    expect(listChunks({ width: 70, depth: 40 })).toEqual([
      { cx: 0, cz: 0 },
      { cx: 1, cz: 0 },
      { cx: 2, cz: 0 },
      { cx: 0, cz: 1 },
      { cx: 1, cz: 1 },
      { cx: 2, cz: 1 },
    ]);
  });

  it('shouldRejectChunksOutsideTheMap', () => {
    expect(isChunkInside(big, { cx: 31, cz: 31 })).toBe(true);
    expect(isChunkInside(big, { cx: 32, cz: 0 })).toBe(false);
    expect(isChunkInside(big, { cx: -1, cz: 0 })).toBe(false);
    expect(isChunkInside(big, { cx: 0.5, cz: 0 })).toBe(false);
    expect(() => chunkBounds(big, { cx: 0, cz: 32 })).toThrow(RangeError);
  });

  it('shouldFindOnlyTheChunksARectTouches', () => {
    expect(chunksTouchedByRect(big, { x: 3, z: 3, width: 5, depth: 5 })).toEqual([
      { cx: 0, cz: 0 },
    ]);
    // Uma quina de pedaços: quatro pedaços.
    expect(chunksTouchedByRect(big, { x: 30, z: 30, width: 4, depth: 4 })).toEqual([
      { cx: 0, cz: 0 },
      { cx: 1, cz: 0 },
      { cx: 0, cz: 1 },
      { cx: 1, cz: 1 },
    ]);
    // Termina exatamente na borda do pedaço: não toca o vizinho.
    expect(chunksTouchedByRect(big, { x: 28, z: 0, width: 4, depth: 1 })).toEqual([
      { cx: 0, cz: 0 },
    ]);
  });

  it('shouldIgnoreThePartOfARectOutsideTheMap', () => {
    expect(chunksTouchedByRect(big, { x: 995, z: 995, width: 20, depth: 20 })).toEqual([
      { cx: 31, cz: 31 },
    ]);
    expect(chunksTouchedByRect(big, { x: -5, z: -5, width: 8, depth: 8 })).toEqual([
      { cx: 0, cz: 0 },
    ]);
    expect(chunksTouchedByRect(big, { x: 2000, z: 0, width: 3, depth: 3 })).toEqual([]);
  });

  it('shouldNumberCellsInsideAChunkRowByRow', () => {
    const bounds = chunkBounds(big, { cx: 31, cz: 0 });
    expect(localIndex(bounds, { x: 992, z: 0 })).toBe(0);
    expect(localIndex(bounds, { x: 999, z: 0 })).toBe(7);
    expect(localIndex(bounds, { x: 992, z: 1 })).toBe(8);
    expect(localIndex(bounds, { x: 999, z: 31 })).toBe(8 * 32 - 1);
  });

  it('shouldBuildStableKeys', () => {
    expect(chunkKey({ cx: 3, cz: 12 })).toBe('3,12');
    expect(chunkKey({ cx: 3, cz: 12 })).toBe(chunkKey({ cx: 3, cz: 12 }));
    expect(chunkKey({ cx: 1, cz: 23 })).not.toBe(chunkKey({ cx: 12, cz: 3 }));
  });
});
