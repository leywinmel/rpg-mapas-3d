import { MAX_TERRAIN_HEIGHT } from './constants';
import type { CellRect } from './rect';
import type { TerrainDocument } from './schema';
import {
  createUniformTerrain,
  decodeTerrain,
  encodeTerrain,
  NO_FLOOR_INDEX,
  tileAtIndex,
  type ChunkTerrain,
} from './terrain';

/** Pedaço pequeno de 4×2 casas (8 casas) no meio de um mapa, para os números ficarem legíveis. */
const bounds: CellRect = { x: 32, z: 64, width: 4, depth: 2 };

function document(overrides: Partial<TerrainDocument> = {}): TerrainDocument {
  return { palette: ['piso-pedra'], tiles: [1, 8], heights: [0, 8], ...overrides };
}

function errorsOf(doc: TerrainDocument): string[] {
  const result = decodeTerrain(doc, bounds);
  return result.ok ? [] : result.errors;
}

describe('terrain', () => {
  it('shouldEncodeAUniformChunkAsAFewNumbers', () => {
    const uniform = encodeTerrain(createUniformTerrain(1024, 'piso-pedra'));
    expect(uniform).toEqual({ palette: ['piso-pedra'], tiles: [1, 1024], heights: [0, 1024] });
  });

  it('shouldEncodeAChunkWithoutFloor', () => {
    expect(encodeTerrain(createUniformTerrain(1024, null))).toEqual({
      palette: [],
      tiles: [NO_FLOOR_INDEX, 1024],
      heights: [0, 1024],
    });
  });

  it('shouldReindexThePaletteByFirstAppearanceAndDropUnusedTiles', () => {
    const terrain: ChunkTerrain = {
      // "b" nunca é usada; "c" aparece antes de "a".
      palette: ['a', 'b', 'c'],
      tiles: Uint16Array.from([3, 3, 1, 0, 3, 1, 1, 0]),
      heights: Uint8Array.from([0, 0, 5, 0, 0, 5, 5, 0]),
    };
    expect(encodeTerrain(terrain)).toEqual({
      palette: ['c', 'a'],
      tiles: [1, 2, 2, 1, 0, 1, 1, 1, 2, 2, 0, 1],
      heights: [0, 2, 5, 1, 0, 2, 5, 2, 0, 1],
    });
  });

  it('shouldRoundTripThroughDecodeAndEncode', () => {
    const doc = document({
      palette: ['c', 'a'],
      tiles: [1, 2, 2, 1, 0, 1, 1, 1, 2, 2, 0, 1],
      heights: [0, 2, 5, 1, 0, 2, 5, 2, 0, 1],
    });
    const decoded = decodeTerrain(doc, bounds);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(Array.from(decoded.value.tiles)).toEqual([1, 1, 2, 0, 1, 2, 2, 0]);
    expect(tileAtIndex(decoded.value, 0)).toBe('c');
    expect(tileAtIndex(decoded.value, 2)).toBe('a');
    expect(tileAtIndex(decoded.value, 3)).toBeNull();
    expect(encodeTerrain(decoded.value)).toEqual(doc);
  });

  it('shouldRejectTileIndexesOutsideThePalette', () => {
    expect(errorsOf(document({ tiles: [2, 8] }))[0]).toMatch(/peças de chão.*valor 2/);
  });

  it('shouldRejectHeightsAboveTheLimit', () => {
    const errors = errorsOf(document({ heights: [MAX_TERRAIN_HEIGHT + 1, 8] }));
    expect(errors[0]).toMatch(/alturas.*fora do limite de 0 a 40/);
  });

  it('shouldRejectRunsThatDoNotCoverTheChunk', () => {
    expect(errorsOf(document({ tiles: [1, 7] }))[0]).toMatch(/somam 7 casas, mas o pedaço tem 8/);
    expect(errorsOf(document({ heights: [0, 9] }))[0]).toMatch(/passam das 8 casas/);
  });

  it('shouldRejectRepeatedPaletteEntries', () => {
    const errors = errorsOf(document({ palette: ['piso-pedra', 'piso-pedra'], tiles: [2, 8] }));
    expect(errors[0]).toMatch(/"piso-pedra" aparece duas vezes/);
  });

  it('shouldRejectHeightOnACellWithoutFloor', () => {
    // A quarta casa (índice 3) fica sem chão mas com altura 2: casa (35, 64) do mapa.
    const errors = errorsOf(document({ tiles: [1, 3, 0, 5], heights: [0, 3, 2, 5] }));
    expect(errors[0]).toMatch(/\(35, 64\).*sem chão mas tem altura/);
  });

  it('shouldAcceptAHoleAtHeightZero', () => {
    expect(errorsOf(document({ tiles: [1, 3, 0, 5], heights: [0, 8] }))).toEqual([]);
  });
});
