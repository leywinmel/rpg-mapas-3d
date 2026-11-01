import { describe, expect, it } from 'vitest';
import { createEmptyDocument, MAX_FLOOR_HEIGHT, parseMapDocument } from '@/domain';
import { FLOOR_STEP_HEIGHT } from '@/features/scene';
import { uploadedAssetIds } from '../hooks/useModelUrls';
import {
  adjustFloorHeight,
  eraseTarget,
  eraseTargetAt,
  floorAt,
  placeProp,
  removeFloor,
  rotateProp,
  setAmbience,
  setFloorTile,
  setWall,
  wallAt,
} from './document-ops';

const SIZE = { width: 4, depth: 3 };
const BARREL = { source: 'catalog', key: 'barril' } as const;
const CENTER = { x: 0.5, z: 0.5 };

function emptyMap() {
  return createEmptyDocument(SIZE);
}

describe('document-ops', () => {
  it('shouldPaintAFloorAndKeepTheSameDocumentWhenNothingChanges', () => {
    const document = emptyMap();
    const painted = setFloorTile(document, SIZE, { cell: { x: 1, z: 1 }, tile: 'grama' });
    expect(floorAt(painted, { x: 1, z: 1 })?.tile).toBe('grama');
    expect(setFloorTile(painted, SIZE, { cell: { x: 1, z: 1 }, tile: 'grama' })).toBe(painted);
    expect(setFloorTile(document, SIZE, { cell: { x: 9, z: 9 }, tile: 'grama' })).toBe(document);
  });

  it('shouldRecreateAFloorThatWasErased', () => {
    const erased = removeFloor(emptyMap(), { x: 0, z: 0 });
    expect(floorAt(erased, { x: 0, z: 0 })).toBeUndefined();
    const painted = setFloorTile(erased, SIZE, { cell: { x: 0, z: 0 }, tile: 'terra' });
    expect(floorAt(painted, { x: 0, z: 0 })).toMatchObject({ tile: 'terra', height: 0 });
  });

  it('shouldRaiseTheFloorWithinLimitsAndLiftThePropsOnIt', () => {
    const cell = { x: 2, z: 1 };
    let document = placeProp(emptyMap(), SIZE, { id: 'p1', asset: BARREL, cell, rotation: 0 });
    document = adjustFloorHeight(document, cell, 1);
    expect(floorAt(document, cell)?.height).toBe(1);
    expect(document.props[0]?.elevation).toBe(FLOOR_STEP_HEIGHT);
    for (let step = 0; step < 20; step += 1) document = adjustFloorHeight(document, cell, 1);
    expect(floorAt(document, cell)?.height).toBe(MAX_FLOOR_HEIGHT);
    expect(adjustFloorHeight(document, cell, 1)).toBe(document);
    const lowered = adjustFloorHeight(adjustFloorHeight(emptyMap(), cell, -1), cell, -1);
    expect(floorAt(lowered, cell)?.height).toBe(0);
  });

  it('shouldPlaceAPropOnTopOfARaisedFloor', () => {
    const cell = { x: 0, z: 0 };
    const raised = adjustFloorHeight(adjustFloorHeight(emptyMap(), cell, 1), cell, 1);
    const document = placeProp(raised, SIZE, { id: 'p1', asset: BARREL, cell, rotation: 450 });
    expect(document.props[0]).toMatchObject({
      x: 0.5,
      z: 0.5,
      elevation: 2 * FLOOR_STEP_HEIGHT,
      rotation: 90,
    });
  });

  it('shouldAddReplaceAndRejectWalls', () => {
    const wall = { x: 4, z: 0, side: 'west', style: 'parede-pedra', height: 2 } as const;
    const withWall = setWall(emptyMap(), SIZE, wall);
    expect(wallAt(withWall, wall)).toEqual(wall);
    const taller = setWall(withWall, SIZE, { ...wall, height: 3 });
    expect(taller.walls).toHaveLength(1);
    expect(taller.walls[0]?.height).toBe(3);
    expect(setWall(taller, SIZE, { ...wall, height: 3 })).toBe(taller);
    expect(setWall(withWall, SIZE, { ...wall, x: 5 })).toBe(withWall);
  });

  it('shouldEraseTheWallNearTheEdgeThenThePropThenTheFloor', () => {
    const cell = { x: 1, z: 1 };
    let document = setWall(emptyMap(), SIZE, {
      x: 1,
      z: 1,
      side: 'north',
      style: 'grade',
      height: 1,
    });
    document = placeProp(document, SIZE, { id: 'p1', asset: BARREL, cell, rotation: 0 });
    const nearNorth = { cell, point: { x: 1.5, z: 1.05 } };
    const middle = { cell, point: { x: 1.5, z: 1.5 } };
    expect(eraseTargetAt(document, nearNorth)).toEqual({
      layer: 'wall',
      edge: { x: 1, z: 1, side: 'north' },
    });
    expect(eraseTargetAt(document, middle)).toEqual({ layer: 'prop', id: 'p1' });
    const withoutProp = eraseTarget(document, { layer: 'prop', id: 'p1' });
    expect(eraseTargetAt(withoutProp, middle)).toEqual({ layer: 'floor', cell });
    const bare = removeFloor(withoutProp, cell);
    expect(eraseTargetAt(bare, middle)).toBeNull();
  });

  it('shouldRotateOnlyTheChosenProp', () => {
    let document = placeProp(emptyMap(), SIZE, {
      id: 'a',
      asset: BARREL,
      cell: { x: 0, z: 0 },
      rotation: 270,
    });
    document = placeProp(document, SIZE, {
      id: 'b',
      asset: BARREL,
      cell: { x: 1, z: 0 },
      rotation: 0,
    });
    const rotated = rotateProp(document, 'a');
    expect(rotated.props.map((prop) => prop.rotation)).toEqual([0, 0]);
    expect(rotateProp(document, 'nao-existe')).toBe(document);
  });

  it('shouldChangeTheAmbienceOnlyWhenAValueChanges', () => {
    const document = emptyMap();
    expect(setAmbience(document, { light: document.ambience.light })).toBe(document);
    expect(setAmbience(document, { light: 1.2 }).ambience.light).toBe(1.2);
  });

  it('shouldProduceDocumentsThatTheDomainAccepts', () => {
    let document = emptyMap();
    document = setWall(document, SIZE, { x: 0, z: 3, side: 'north', style: 'grade', height: 4 });
    document = adjustFloorHeight(document, { x: 3, z: 2 }, 1);
    document = placeProp(document, SIZE, {
      id: '0b8a3c1e-1d1f-4c55-9a40-2f5f3cbb2a11',
      asset: { source: 'upload', assetId: '0b8a3c1e-1d1f-4c55-9a40-2f5f3cbb2a11' },
      cell: { x: 3, z: 2 },
      rotation: 180,
    });
    expect(parseMapDocument(document, SIZE).ok).toBe(true);
  });

  it('shouldListEachUploadedModelOnce', () => {
    let document = emptyMap();
    const upload = { source: 'upload', assetId: 'b-model' } as const;
    for (const [index, cell] of [CENTER, CENTER].entries()) {
      document = placeProp(document, SIZE, {
        id: `u${index}`,
        asset: upload,
        cell: { x: Math.floor(cell.x), z: index },
        rotation: 0,
      });
    }
    document = placeProp(document, SIZE, {
      id: 'c',
      asset: BARREL,
      cell: { x: 2, z: 2 },
      rotation: 0,
    });
    expect(uploadedAssetIds(document)).toEqual(['b-model']);
    expect(uploadedAssetIds(null)).toEqual([]);
  });
});
