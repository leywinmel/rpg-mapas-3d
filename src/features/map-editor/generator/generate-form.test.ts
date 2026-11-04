import { describe, expect, it } from 'vitest';
import { EXAMPLE_MAPS, MAX_SEED, SETTLEMENT_STYLES, TERRAIN_CLASS } from '@/domain/map-gen';
import { exampleValues, parseGenerateMap, presetSize, randomSeed } from './generate-form';
import { previewPalette } from './preview-colors';

describe('formulário do gerador', () => {
  it('shouldAcceptAnExampleAndConvertTheSeed', () => {
    const parsed = parseGenerateMap(exampleValues(EXAMPLE_MAPS[0]!));
    expect(parsed).toEqual({
      ok: true,
      value: { name: 'Vila medieval', style: 'medieval', preset: 'village', seed: 1201 },
    });
  });

  it('shouldExplainEachInvalidField', () => {
    const parsed = parseGenerateMap({ name: ' ', style: 'gótico', preset: 'village', seed: '-1' });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.name).toBe('Dê um nome ao mapa.');
    expect(parsed.errors.style).toBeDefined();
    expect(parsed.errors.seed).toBe('A semente não pode ser negativa.');
  });

  it('shouldDrawSeedsInsideTheRange', () => {
    expect(randomSeed(() => 0)).toBe(0);
    expect(randomSeed(() => 0.999999999999)).toBe(MAX_SEED);
    expect(presetSize('town')).toEqual({ width: 160, depth: 160 });
  });

  it.each(SETTLEMENT_STYLES)('shouldColorEveryTerrainClass (%s)', (style) => {
    const palette = previewPalette(style);
    for (const terrain of Object.values(TERRAIN_CLASS)) {
      expect(palette[terrain]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    // Ruas e prédios precisam se distinguir na prévia.
    expect(palette[TERRAIN_CLASS.road]).not.toBe(palette[TERRAIN_CLASS.building]);
  });
});
