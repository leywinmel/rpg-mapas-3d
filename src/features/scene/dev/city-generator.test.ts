import { describe, expect, it } from 'vitest';
import { countCity, generateCity } from './city-generator';

const SIZE = { width: 70, depth: 40 };

describe('city generator for measuring', () => {
  it('shouldMakeTheSameCityForTheSameSeed', () => {
    const a = countCity(generateCity({ size: SIZE, seed: 3 }));
    const b = countCity(generateCity({ size: SIZE, seed: 3 }));
    expect(a).toEqual(b);
  });

  it('shouldCountEveryChunkWallAndPiece', () => {
    const counts = countCity(generateCity({ size: SIZE, seed: 11, style: 'modern' }));
    expect(counts.chunks).toBe(6);
    expect(counts.cells).toBe(SIZE.width * SIZE.depth);
    expect(counts.walls).toBeGreaterThan(0);
    expect(counts.pieces).toBeGreaterThan(0);
  });
});
