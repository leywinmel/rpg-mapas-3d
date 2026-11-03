import { describe, expect, it } from 'vitest';
import { parseChunk, serializeChunk } from '@/domain/map-v2';
import { countCity, createRandom, generateCity } from './city-generator';

const SIZE = { width: 70, depth: 40 };

describe('city generator for measuring', () => {
  it('shouldMakeChunksTheDomainAccepts', () => {
    const model = generateCity({ size: SIZE, seed: 7 });
    for (const chunk of model.chunks.values()) {
      const parsed = parseChunk(JSON.parse(JSON.stringify(serializeChunk(chunk))), {
        size: SIZE,
        coord: chunk.coord,
      });
      expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    }
  });

  it('shouldMakeTheSameCityForTheSameSeed', () => {
    const a = countCity(generateCity({ size: SIZE, seed: 3 }));
    const b = countCity(generateCity({ size: SIZE, seed: 3 }));
    expect(a).toEqual(b);
    expect(createRandom(1)()).toBe(createRandom(1)());
  });

  it('shouldHaveStackedStoriesMultiCellPiecesAndTorches', () => {
    const model = generateCity({ size: SIZE, seed: 11 });
    const chunks = [...model.chunks.values()];
    const walls = chunks.flatMap((chunk) => chunk.walls);
    const pieces = chunks.flatMap((chunk) => chunk.pieces);
    expect(new Set(walls.map((wall) => wall.level)).size).toBeGreaterThan(2);
    expect(pieces.some((piece) => piece.footprint.width > 1)).toBe(true);
    expect(
      pieces.some((piece) => piece.asset.source === 'catalog' && piece.asset.key === 'tocha'),
    ).toBe(true);
    expect(countCity(model).chunks).toBe(6);
  });
});
