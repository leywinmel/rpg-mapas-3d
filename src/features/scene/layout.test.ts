import { resolvePreset, fogRange, AMBIENCE_PRESETS } from './ambience';
import type { Cell, MapResult } from '@/domain';
import { createEmptyMap, paintTerrainCell, setTerrainHeight, type MapModel } from '@/domain/map-v2';
import {
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
  modelHeightMap,
  pickCell,
  regroupWallSegments,
  stackedWallSegments,
  type HeightMap,
  type Ray,
} from './layout';

const size = { width: 4, depth: 3 };

type Raised = { x: number; z: number; height: number };

function unwrap(result: MapResult<MapModel>): MapModel {
  if (!result.ok) throw new Error(result.errors.join(' | '));
  return result.value;
}

/** Alturas de um mapa liso com algumas casas erguidas e, se pedir, casas sem chão. */
function heightsOf(raised: readonly Raised[], holes: readonly Cell[] = []): HeightMap {
  let model = createEmptyMap(size);
  for (const { x, z, height } of raised) {
    model = unwrap(setTerrainHeight(model, { from: { x, z }, to: { x, z }, height }));
  }
  for (const cell of holes) model = unwrap(paintTerrainCell(model, { cell, tile: null }));
  return modelHeightMap(model);
}

function rayDown(x: number, z: number): Ray {
  return { origin: { x, y: 20, z }, direction: { x: 0, y: -1, z: 0 } };
}

describe('height map', () => {
  it('shouldMarkEmptyCellsAndReadHeights', () => {
    const map = heightsOf([{ x: 1, z: 2, height: 3 }], [{ x: 0, z: 0 }]);
    expect(heightAt(map, { x: 1, z: 2 })).toBe(3);
    expect(heightAt(map, { x: 0, z: 0 })).toBe(NO_FLOOR);
    expect(heightAt(map, { x: 9, z: 9 })).toBe(NO_FLOOR);
  });
});

describe('pickCell', () => {
  it('shouldPickTheCellStraightBelow', () => {
    const map = heightsOf([]);
    expect(pickCell(rayDown(2.4, 1.7), map)?.cell).toEqual({ x: 2, z: 1 });
  });

  it('shouldHitTheTopOfARaisedCellBeforeTheGroundBehindIt', () => {
    const map = heightsOf([{ x: 1, z: 0, height: 4 }]);
    // Raio inclinado que passa sobre a casa (1,0) na altura do topo dela (y = 2).
    const ray: Ray = { origin: { x: -0.5, y: 4, z: 0.5 }, direction: { x: 1, y: -1, z: 0 } };
    const hit = pickCell(ray, map);
    expect(hit?.cell).toEqual({ x: 1, z: 0 });
    expect(hit?.surface).toBe(floorTop(4));
  });

  it('shouldPickARaisedCellWhenTheRayHitsItsSideInsteadOfTheGroundBehind', () => {
    const map = heightsOf([{ x: 2, z: 1, height: 2 }]);
    // Chega em x = 2 na altura 0,75, abaixo do topo (y = 1): bate na lateral oeste da casa (2,1).
    const ray: Ray = { origin: { x: 0.5, y: 1.5, z: 1.5 }, direction: { x: 1, y: -0.5, z: 0 } };
    const hit = pickCell(ray, map);
    expect(hit?.cell).toEqual({ x: 2, z: 1 });
    expect(hit?.point.x).toBeCloseTo(2);
    expect(hit?.surface).toBe(floorTop(2));
  });

  it('shouldHitTheOuterSideOfABorderBlockWhenTheRayComesFromOutsideTheBoard', () => {
    const map = heightsOf([{ x: 0, z: 1, height: 4 }]);
    const ray: Ray = { origin: { x: -3, y: 2.5, z: 1.5 }, direction: { x: 1, y: -0.5, z: 0 } };
    expect(pickCell(ray, map)?.cell).toEqual({ x: 0, z: 1 });
  });

  it('shouldReturnNullOutsideTheMapOrForHorizontalRays', () => {
    const map = heightsOf([]);
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

  it('shouldStackOneSegmentPerWorldUnitAndFlattenTheRemainder', () => {
    const segments = stackedWallSegments({ x: 1, z: 1, side: 'north' }, 1, 2.5);
    expect(segments.map((segment) => segment.y)).toEqual([1, 2, 3]);
    expect(segments[0]).toMatchObject({ x: 1.5, z: 1, rotationY: 0, scale: 1 });
    expect(segments[2]?.scaleY).toBeCloseTo(0.5);
    const west = stackedWallSegments({ x: 0, z: 2, side: 'west' }, 0, 1);
    expect(west).toEqual([{ x: 0, z: 2.5, rotationY: 90, y: 0, scale: 1 }]);
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
    const frame = cameraFrame({ width: 8, depth: 8 });
    expect(frame.target).toEqual({ x: 4, y: 0, z: 4 });
    expect(frame.position.y).toBeGreaterThan(0);
    expect(frame.maxDistance).toBeGreaterThan(frame.minDistance);
    expect(clampToBoard({ x: -3, y: 0, z: 25 }, { width: 10, depth: 20 })).toEqual({
      x: 0,
      y: 0,
      z: 20,
    });
  });
});

describe('camera on a giant map', () => {
  it('shouldBackAwayUntilTheWholeMapFitsAndAimJustInFrontOfTheCenter', () => {
    const size = { width: 1000, depth: 1000 };
    const frame = cameraFrame(size);
    const { position, target } = frame;
    const distance = Math.hypot(position.x - target.x, position.y, position.z - target.z);
    expect(distance).toBeGreaterThan(Math.hypot(1000, 1000) / 2);
    expect(distance).toBeLessThan(frame.maxDistance);
    expect(frame.far).toBeGreaterThan(distance + 1000);
    // Mira entre o centro e a ponta da frente, nunca perto do canto (0,0).
    expect(target.x).toBeGreaterThan(500);
    expect(target.x).toBeLessThan(1000);
    expect(target.z).toBe(target.x);
  });
});

describe('ambience', () => {
  it('shouldFallBackToTheDefaultPresetAndScaleFogWithTheMap', () => {
    expect(resolvePreset('nao-existe')).toBe(AMBIENCE_PRESETS[0]);
    const small = fogRange(
      { preset: 'masmorra', fogColor: '#000000', light: 1, backdrop: 'none' },
      10,
    );
    const big = fogRange(
      { preset: 'masmorra', fogColor: '#000000', light: 1, backdrop: 'none' },
      100,
    );
    expect(big.far).toBeGreaterThan(small.far);
    expect(small.near).toBeLessThan(small.far);
  });
});

describe('regroupWallSegments', () => {
  const edge = { x: 2, z: 3, side: 'north' } as const;

  it('shouldTurnOneStoryOfUnitSegmentsIntoOneStoryPiece', () => {
    const regrouped = regroupWallSegments(stackedWallSegments(edge, 0, 2), 2);
    expect(regrouped).toEqual([{ x: 2.5, y: 0, z: 3, rotationY: 0, scale: 1 }]);
  });

  it('shouldSquashTheLeftoverAboveTheLastFullStory', () => {
    const regrouped = regroupWallSegments(stackedWallSegments(edge, 1, 3), 2);
    expect(regrouped.map((segment) => [segment.y, segment.scaleY])).toEqual([
      [1, undefined],
      [3, 0.5],
    ]);
  });

  it('shouldKeepSeparateEdgesAndGapsApart', () => {
    const other = { x: 2, z: 3, side: 'west' } as const;
    const segments = [
      ...stackedWallSegments(edge, 0, 2),
      ...stackedWallSegments(edge, 4, 2),
      ...stackedWallSegments(other, 0, 2),
    ];
    expect(regroupWallSegments(segments, 2)).toHaveLength(3);
  });

  it('shouldLeaveUnitSegmentsAloneForSpanOne', () => {
    const segments = stackedWallSegments(edge, 0, 2);
    expect(regroupWallSegments(segments, 1)).toEqual(segments);
  });
});

describe('floorColumnTransform with a model cap', () => {
  it('shouldRiseUpToTheBaseOfAThinCap', () => {
    const column = floorColumnTransform({ x: 0, z: 0, tile: 'x', height: 0 }, 0.01);
    expect(column.y).toBeCloseTo(-0.01);
    expect(column.scaleY).toBeCloseTo(FLOOR_BASE_DEPTH - 0.01);
  });
});
