import { describe, expect, it } from 'vitest';
import {
  changedChunks,
  createEmptyMap,
  placePiece,
  setTerrainHeight,
  terrainAt,
  type MapModel,
} from '../map-v2';
import { errorsOf, makePiece, unwrap } from '../map-v2/test-fixtures';
import { placePrefab, prefabRect } from './place-prefab';
import { findPrefab, prefabBlueprint, PREFABS } from './prefabs';

const newId = (index: number) => `casa-${index}`;
const cottage = prefabBlueprint(findPrefab('medieval-cabana')!);

function allWalls(model: MapModel) {
  return [...model.chunks.values()].flatMap((chunk) => chunk.walls);
}

function allPieces(model: MapModel) {
  return [...model.chunks.values()].flatMap((chunk) => chunk.pieces);
}

describe('prefabs', () => {
  it('shouldHaveUniqueIdsAndBuildEveryPrefab', () => {
    expect(new Set(PREFABS.map((prefab) => prefab.id)).size).toBe(PREFABS.length);
    for (const prefab of PREFABS) {
      const blueprint = prefabBlueprint(prefab);
      expect(blueprint.walls.length).toBeGreaterThan(0);
      expect(blueprint.stories).toBe(prefab.stories);
    }
    expect(new Set(PREFABS.map((prefab) => prefab.style))).toEqual(
      new Set(['medieval', 'modern', 'futurist']),
    );
  });

  it('shouldCenterTheRectOnTheCursorAndSwapSidesWhenTurned', () => {
    const long = prefabBlueprint(findPrefab('medieval-casa-comprida')!);
    expect(prefabRect(long, { x: 10, z: 10 }, 0)).toEqual({ x: 8, z: 6, width: 4, depth: 8 });
    expect(prefabRect(long, { x: 10, z: 10 }, 1)).toEqual({ x: 6, z: 8, width: 8, depth: 4 });
  });
});

describe('placePrefab', () => {
  it('shouldPlaceTheWholeHouseInOneModel', () => {
    const model = createEmptyMap({ width: 40, depth: 40 });
    const placed = unwrap(
      placePrefab(model, { blueprint: cottage, center: { x: 20, z: 20 }, rotation: 0, newId }),
    );
    expect(allWalls(placed)).toHaveLength(cottage.walls.length);
    expect(allPieces(placed)).toHaveLength(cottage.pieces.length);
    expect(terrainAt(placed, { x: 18, z: 18 })?.tile).toBe(cottage.floor);
    expect(changedChunks(model, placed).length).toBeGreaterThan(0);
  });

  it('shouldLevelTheGroundOnTheHighestCellAndLiftTheHouse', () => {
    const empty = createEmptyMap({ width: 40, depth: 40 });
    const hill = unwrap(
      setTerrainHeight(empty, { from: { x: 19, z: 19 }, to: { x: 19, z: 19 }, height: 3 }),
    );
    const placed = unwrap(
      placePrefab(hill, { blueprint: cottage, center: { x: 20, z: 20 }, rotation: 0, newId }),
    );
    expect(terrainAt(placed, { x: 18, z: 18 })?.height).toBe(3);
    expect(allWalls(placed).every((wall) => wall.level >= 3)).toBe(true);
    expect(Math.min(...allPieces(placed).map((piece) => piece.level))).toBe(3);
  });

  it('shouldCarryWhatWasRestingOnTheGround', () => {
    const empty = createEmptyMap({ width: 40, depth: 40 });
    const raised = unwrap(
      setTerrainHeight(empty, { from: { x: 21, z: 21 }, to: { x: 21, z: 21 }, height: 2 }),
    );
    const barrel = makePiece({ id: 'barril', x: 18, z: 18, level: 0 });
    const withBarrel = unwrap(placePiece(raised, barrel));
    const placed = unwrap(
      placePrefab(withBarrel, { blueprint: cottage, center: { x: 20, z: 20 }, rotation: 0, newId }),
    );
    // O barril estava apoiado no chão nivelado: sobe junto (decisão 13).
    expect(allPieces(placed).find((piece) => piece.id === 'barril')?.level).toBe(2);
  });

  it('shouldRefuseWhenTheHouseDoesNotFitAndKeepTheMap', () => {
    const model = createEmptyMap({ width: 10, depth: 10 });
    const result = placePrefab(model, {
      blueprint: cottage,
      center: { x: 0, z: 0 },
      rotation: 0,
      newId,
    });
    expect(errorsOf(result)[0]).toContain('não cabe');
  });

  it('shouldRefuseRepeatedIds', () => {
    const model = createEmptyMap({ width: 40, depth: 40 });
    const result = placePrefab(model, {
      blueprint: cottage,
      center: { x: 20, z: 20 },
      rotation: 0,
      newId: () => 'mesmo',
    });
    expect(errorsOf(result)[0]).toContain('mesmo');
  });

  it('shouldTurnTheHouse', () => {
    const long = prefabBlueprint(findPrefab('medieval-casa-comprida')!);
    const model = createEmptyMap({ width: 40, depth: 40 });
    const placed = unwrap(
      placePrefab(model, { blueprint: long, center: { x: 20, z: 20 }, rotation: 1, newId }),
    );
    const xs = allWalls(placed).map((wall) => wall.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(8);
  });
});
