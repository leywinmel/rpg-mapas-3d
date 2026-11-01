import { resolvePreset, fogRange, AMBIENCE_PRESETS } from './ambience';
import {
  buildHeightMap,
  cameraFrame,
  clampToBoard,
  distanceToNearestEdge,
  fitModelToCell,
  floorColumnTransform,
  floorTop,
  FLOOR_BASE_DEPTH,
  FLOOR_CAP_DEPTH,
  heightAt,
  instanceCapacity,
  MODEL_FOOTPRINT,
  nearestEdge,
  NO_FLOOR,
  pickCell,
  wallSegmentTransforms,
  type Ray,
} from './layout';

const size = { width: 4, depth: 3 };

function rayDown(x: number, z: number): Ray {
  return { origin: { x, y: 20, z }, direction: { x: 0, y: -1, z: 0 } };
}

describe('height map', () => {
  it('shouldMarkEmptyCellsAndReadHeights', () => {
    const map = buildHeightMap([{ x: 1, z: 2, tile: 'terra', height: 3 }], size);
    expect(heightAt(map, { x: 1, z: 2 })).toBe(3);
    expect(heightAt(map, { x: 0, z: 0 })).toBe(NO_FLOOR);
    expect(heightAt(map, { x: 9, z: 9 })).toBe(NO_FLOOR);
  });
});

describe('pickCell', () => {
  it('shouldPickTheCellStraightBelow', () => {
    const map = buildHeightMap([], size);
    expect(pickCell(rayDown(2.4, 1.7), map)?.cell).toEqual({ x: 2, z: 1 });
  });

  it('shouldHitTheTopOfARaisedCellBeforeTheGroundBehindIt', () => {
    const map = buildHeightMap([{ x: 1, z: 0, tile: 'terra', height: 4 }], size);
    // Raio inclinado que passa sobre a casa (1,0) na altura do topo dela (y = 2).
    const ray: Ray = { origin: { x: -0.5, y: 4, z: 0.5 }, direction: { x: 1, y: -1, z: 0 } };
    const hit = pickCell(ray, map);
    expect(hit?.cell).toEqual({ x: 1, z: 0 });
    expect(hit?.surface).toBe(floorTop(4));
  });

  it('shouldReturnNullOutsideTheMapOrForHorizontalRays', () => {
    const map = buildHeightMap([], size);
    expect(pickCell(rayDown(-1, 1), map)).toBeNull();
    expect(
      pickCell({ origin: { x: 0, y: 1, z: 0 }, direction: { x: 1, y: 0, z: 0 } }, map),
    ).toBeNull();
  });
});

describe('edges', () => {
  it('shouldSnapToTheClosestEdgeUsingNorthAndWestOnly', () => {
    const cell = { x: 2, z: 1 };
    expect(nearestEdge(cell, { x: 2.5, z: 1.05 })).toEqual({ x: 2, z: 1, side: 'north' });
    expect(nearestEdge(cell, { x: 2.5, z: 1.95 })).toEqual({ x: 2, z: 2, side: 'north' });
    expect(nearestEdge(cell, { x: 2.04, z: 1.5 })).toEqual({ x: 2, z: 1, side: 'west' });
    expect(nearestEdge(cell, { x: 2.96, z: 1.5 })).toEqual({ x: 3, z: 1, side: 'west' });
    expect(distanceToNearestEdge(cell, { x: 2.5, z: 1.5 })).toBeCloseTo(0.5);
  });
});

describe('transforms', () => {
  it('shouldStretchTheColumnFromTheBaseToTheCap', () => {
    const column = floorColumnTransform({ x: 0, z: 0, tile: 'terra', height: 2 });
    expect(column.y).toBeCloseTo(floorTop(2) - FLOOR_CAP_DEPTH);
    expect(column.scaleY).toBeCloseTo(floorTop(2) - FLOOR_CAP_DEPTH + FLOOR_BASE_DEPTH);
  });

  it('shouldStackOneSegmentPerWallLevelOnTheHigherNeighbor', () => {
    const map = buildHeightMap(
      [
        { x: 1, z: 1, tile: 'terra', height: 0 },
        { x: 1, z: 0, tile: 'terra', height: 2 },
      ],
      size,
    );
    const segments = wallSegmentTransforms(map, {
      x: 1,
      z: 1,
      side: 'north',
      style: 'parede-pedra',
      height: 3,
    });
    expect(segments.map((segment) => segment.y)).toEqual([1, 2, 3]);
    expect(segments[0]).toMatchObject({ x: 1.5, z: 1, rotationY: 0 });
    const west = wallSegmentTransforms(map, {
      x: 0,
      z: 2,
      side: 'west',
      style: 'grade',
      height: 1,
    });
    expect(west[0]).toMatchObject({ x: 0, z: 2.5, rotationY: 90, y: 0 });
  });
});

describe('fitModelToCell', () => {
  it('shouldShrinkAGiantModelIntoOneCellRestingOnTheFloor', () => {
    const fit = fitModelToCell({ min: { x: -50, y: 10, z: -20 }, max: { x: 50, y: 60, z: 20 } });
    expect(fit.scale).toBeCloseTo(MODEL_FOOTPRINT / 100);
    expect(fit.offset.y).toBeCloseTo(-10 * fit.scale);
    expect(fit.offset.x).toBeCloseTo(0);
  });

  it('shouldLimitTallModelsByHeight', () => {
    const fit = fitModelToCell({ min: { x: 0, y: 0, z: 0 }, max: { x: 0.1, y: 10, z: 0.1 } });
    expect(fit.scale).toBeCloseTo(0.2);
    expect(fit.offset.x).toBeCloseTo(-0.01);
  });

  it('shouldKeepScaleOneForEmptyBoxes', () => {
    expect(fitModelToCell({ min: { x: 1, y: 1, z: 1 }, max: { x: 1, y: 1, z: 1 } }).scale).toBe(1);
  });
});

describe('instanceCapacity', () => {
  it('shouldGrowInPowersOfTwo', () => {
    expect(instanceCapacity(0)).toBe(16);
    expect(instanceCapacity(17)).toBe(32);
    expect(instanceCapacity(10_000)).toBe(16_384);
  });
});

describe('camera', () => {
  it('shouldFrameTheMapCenterAndKeepTheTargetOnTheBoard', () => {
    const frame = cameraFrame({ width: 10, depth: 20 });
    expect(frame.target).toEqual({ x: 5, y: 0, z: 10 });
    expect(frame.position.y).toBeGreaterThan(0);
    expect(frame.maxDistance).toBeGreaterThan(frame.minDistance);
    expect(clampToBoard({ x: -3, y: 0, z: 25 }, { width: 10, depth: 20 })).toEqual({
      x: 0,
      y: 0,
      z: 20,
    });
  });
});

describe('ambience', () => {
  it('shouldFallBackToTheDefaultPresetAndScaleFogWithTheMap', () => {
    expect(resolvePreset('nao-existe')).toBe(AMBIENCE_PRESETS[0]);
    const small = fogRange({ preset: 'masmorra', fogColor: '#000000', light: 1 }, 10);
    const big = fogRange({ preset: 'masmorra', fogColor: '#000000', light: 1 }, 100);
    expect(big.far).toBeGreaterThan(small.far);
    expect(small.near).toBeLessThan(small.far);
  });
});
