import { describe, expect, it } from 'vitest';
import { TERRAIN_CLASS } from './layout';
import { PREVIEW_MAX_SAMPLES, previewSettlement } from './preview';
import { createRandom, deriveSeed, MAX_SEED } from './random';

describe('settlement preview', () => {
  it('shouldSampleTheBigCityInAFewPoints', () => {
    const preview = previewSettlement({
      style: 'futurist',
      size: { width: 1000, depth: 1000 },
      seed: 1,
    });
    expect(preview.columns).toBeLessThanOrEqual(PREVIEW_MAX_SAMPLES);
    expect(preview.classes).toHaveLength(preview.columns * preview.rows);
    expect(preview.classes).toContain(TERRAIN_CLASS.road);
    expect(preview.classes).toContain(TERRAIN_CLASS.building);
    expect(preview.buildings).toBeGreaterThan(1000);
  });

  it('shouldKeepOnePointPerCellOnSmallMaps', () => {
    const preview = previewSettlement({
      style: 'medieval',
      size: { width: 64, depth: 40 },
      seed: 1,
    });
    expect([preview.columns, preview.rows]).toEqual([64, 40]);
  });
});

describe('random', () => {
  it('shouldRepeatTheSequenceForTheSameSeed', () => {
    const a = createRandom(7);
    const b = createRandom(7);
    expect([a.next(), a.between(1, 6), a.pick(['x', 'y'])]).toEqual([
      b.next(),
      b.between(1, 6),
      b.pick(['x', 'y']),
    ]);
  });

  it('shouldDeriveSeedsInsideTheRange', () => {
    const seed = deriveSeed(MAX_SEED, 1, 2, 3);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(MAX_SEED);
    expect(deriveSeed(1, 2)).not.toBe(deriveSeed(1, 3));
  });
});
