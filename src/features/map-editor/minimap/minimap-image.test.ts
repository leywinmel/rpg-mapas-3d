import { describe, expect, it } from 'vitest';
import { createEmptyMap, paintTerrainCell } from '@/domain/map-v2';
import { pieceCatalog } from '@/features/scene';
import { cellAtFraction, MINIMAP_MAX_SAMPLES, minimapImage, showsMinimap } from './minimap-image';

function unwrap<T>(result: { ok: true; value: T } | { ok: false; errors: string[] }): T {
  if (!result.ok) throw new Error(result.errors.join(' | '));
  return result.value;
}

describe('minimap image', () => {
  it('shouldSampleAGiantMapWithoutReadingEveryCell', () => {
    const image = minimapImage(createEmptyMap({ width: 1000, depth: 500 }));
    expect(image.columns).toBeLessThanOrEqual(MINIMAP_MAX_SAMPLES);
    expect(image.step).toBe(8);
    expect(image.rows).toBe(Math.ceil(500 / 8));
    expect(image.colors).toHaveLength(image.columns * image.rows);
  });

  it('shouldColorEachCellOfASmallMapAndLeaveHolesEmpty', () => {
    const model = unwrap(
      paintTerrainCell(createEmptyMap({ width: 3, depth: 2 }), {
        cell: { x: 1, z: 0 },
        tile: null,
      }),
    );
    const image = minimapImage(model);
    expect(image.step).toBe(1);
    expect(image.colors[0]).toBe(pieceCatalog.get('piso-pedra')?.farColor);
    expect(image.colors[1]).toBeNull();
  });

  it('shouldTurnAClickFractionIntoACellInsideTheMap', () => {
    const model = createEmptyMap({ width: 100, depth: 50 });
    expect(cellAtFraction(model, 0.5, 0.5)).toEqual({ x: 50, z: 25 });
    expect(cellAtFraction(model, 1.2, -0.1)).toEqual({ x: 99, z: 0 });
  });

  it('shouldOnlyShowOnMapsTooBigToSeeAtOnce', () => {
    expect(showsMinimap(createEmptyMap({ width: 12, depth: 12 }))).toBe(false);
    expect(showsMinimap(createEmptyMap({ width: 100, depth: 12 }))).toBe(true);
  });
});
