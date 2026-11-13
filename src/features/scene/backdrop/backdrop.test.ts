import { describe, expect, it } from 'vitest';
import { BACKDROPS } from '@/domain';
import {
  BACKDROP_LABELS,
  BACKDROP_MARGIN,
  BACKDROP_SPECS,
  backdropRing,
  groundRadius,
  scatterBackdrop,
  type SceneBackdrop,
} from './backdrop';

const size = { width: 20, depth: 12 };
const SCENE_BACKDROPS = BACKDROPS.filter((item): item is SceneBackdrop => item !== 'none');

function allTransforms(backdrop: SceneBackdrop, level?: 'high' | 'low') {
  return scatterBackdrop(backdrop, size, { level }).flatMap((group) => group.transforms);
}

describe('backdrop scatter', () => {
  it('shouldNameEveryBackdropOnScreen', () => {
    for (const backdrop of BACKDROPS) expect(BACKDROP_LABELS[backdrop]).toBeTruthy();
  });

  it.each(SCENE_BACKDROPS)('shouldKeepThe%sBackdropOffTheMap', (backdrop) => {
    const transforms = allTransforms(backdrop);
    expect(transforms.length).toBeGreaterThan(0);
    for (const { x, z } of transforms) {
      const insideX = x > -BACKDROP_MARGIN + 1e-6 && x < size.width + BACKDROP_MARGIN - 1e-6;
      const insideZ = z > -BACKDROP_MARGIN + 1e-6 && z < size.depth + BACKDROP_MARGIN - 1e-6;
      expect(insideX && insideZ).toBe(false);
    }
  });

  it('shouldStayInsideTheGroundDisc', () => {
    const ring = backdropRing(size);
    const radius = groundRadius(ring);
    for (const { x, z } of allTransforms('forest')) {
      expect(Math.hypot(x - ring.center.x, z - ring.center.z)).toBeLessThanOrEqual(radius);
    }
  });

  it('shouldDrawTheSameLandscapeForTheSameMap', () => {
    expect(allTransforms('city')).toEqual(allTransforms('city'));
  });

  it('shouldThinTheLandscapeOnLowQuality', () => {
    expect(allTransforms('forest', 'low').length).toBeLessThan(allTransforms('forest').length);
  });

  it('shouldCapThePieceCountOnAHugeMap', () => {
    const huge = scatterBackdrop('forest', { width: 1000, depth: 1000 });
    for (const [index, group] of huge.entries()) {
      expect(group.transforms.length).toBeLessThanOrEqual(BACKDROP_SPECS.forest.groups[index]!.max);
    }
  });

  it('shouldGrowThePiecesOnABigMap', () => {
    const biggest = (side: number) =>
      Math.max(
        ...scatterBackdrop('desert', { width: side, depth: side }).flatMap((group) =>
          group.transforms.map((item) => item.scale),
        ),
      );
    expect(biggest(200)).toBeGreaterThan(biggest(20));
  });
});
