import { describe, expect, it } from 'vitest';
import { Frustum, Matrix4, PerspectiveCamera } from 'three';
import { createEmptyMap, getChunk, type MapChunk } from '@/domain/map-v2';
import type { Box } from '../layout';
import {
  boxIntersectsFrustum,
  chunkDetail,
  chunkLayers,
  chunkWorldBox,
  distanceToBox,
  type ChunkView,
  type FrustumPlane,
} from './chunk-culling';

/** Câmera a 20 de altura sobre (16, 0, 16), olhando para baixo, como a cena monta o frustum. */
function planesLookingDownAt(x: number, z: number): FrustumPlane[] {
  const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(x, 20, z + 0.001);
  camera.lookAt(x, 0, z);
  camera.updateMatrixWorld();
  const frustum = new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  return frustum.planes.map((plane) => ({
    x: plane.normal.x,
    y: plane.normal.y,
    z: plane.normal.z,
    constant: plane.constant,
  }));
}

function box(x: number, z: number, side = 32): Box {
  return { min: { x, y: 0, z }, max: { x: x + side, y: 2, z: z + side } };
}

const map = createEmptyMap({ width: 100, depth: 100 });
const chunkAt = (cx: number, cz: number): MapChunk => getChunk(map, { cx, cz });

describe('chunk box', () => {
  it('shouldCoverTheChunkWithAMarginAndTheTallestWall', () => {
    const chunk = {
      ...chunkAt(1, 0),
      walls: [{ x: 40, z: 3, side: 'north', style: 'parede-pedra', height: 8, level: 4 } as const],
    };
    const result = chunkWorldBox(chunk);
    expect(result.min).toMatchObject({ x: 31, z: -1 });
    expect(result.max).toMatchObject({ x: 65, z: 33 });
    // Topo da parede: degrau 12 = 6 unidades, mais a folga.
    expect(result.max.y).toBe(7);
  });

  it('shouldGrowToReachAPieceThatSpillsIntoTheNeighbor', () => {
    const chunk = {
      ...chunkAt(0, 0),
      pieces: [
        {
          id: 'carroca',
          asset: { source: 'catalog', key: 'mesa' },
          x: 30,
          z: 0,
          level: 0,
          rotation: 0,
          footprint: { width: 4, depth: 2 },
          scale: 1,
        } as const,
      ],
    };
    expect(chunkWorldBox(chunk).max.x).toBe(35);
  });
});

describe('frustum test', () => {
  const planes = planesLookingDownAt(16, 16);

  it('shouldKeepTheChunkUnderTheCameraAndDropAFarAwayOne', () => {
    expect(boxIntersectsFrustum(box(0, 0), planes)).toBe(true);
    expect(boxIntersectsFrustum(box(320, 320), planes)).toBe(false);
  });

  it('shouldKeepAChunkThatOnlyTouchesTheEdgeOfTheView', () => {
    // A 20 de altura com 45° de abertura a vista cobre ~8,3 unidades para cada lado do centro (x de 7,7 a 24,3).
    expect(boxIntersectsFrustum(box(23, 14, 4), planes)).toBe(true);
    expect(boxIntersectsFrustum(box(30, 14, 4), planes)).toBe(false);
  });
});

describe('distance to a box', () => {
  it('shouldBeZeroInsideAndStraightLineOutside', () => {
    expect(distanceToBox({ x: 5, y: 1, z: 5 }, box(0, 0))).toBe(0);
    expect(distanceToBox({ x: 35, y: 6, z: 16 }, box(0, 0))).toBe(5);
  });
});

describe('chunk detail', () => {
  const view: ChunkView = {
    planes: planesLookingDownAt(16, 16),
    eye: { x: 16, y: 20, z: 16 },
    maxDistance: 100,
    detailDistance: 19,
  };

  it('shouldDrawEverythingCloseOnlyTheBulkFartherAndNothingPastTheFog', () => {
    expect(chunkDetail(box(0, 0), view)).toBe('full');
    expect(chunkDetail(box(0, 0), { ...view, detailDistance: 10 })).toBe('coarse');
    expect(chunkDetail(box(0, 0), { ...view, maxDistance: 10 })).toBe('hidden');
  });

  it('shouldHideAChunkOutsideTheView', () => {
    expect(chunkDetail(box(320, 320), view)).toBe('hidden');
  });
});

describe('chunk layers', () => {
  it('shouldShowTheDetailedDrawingUpCloseOnceItIsMounted', () => {
    expect(chunkLayers('full', true)).toEqual({ root: true, near: true, far: false });
  });

  it('shouldHoldThePlaceWithTheFarBlocksWhileTheDetailedDrawingMounts', () => {
    expect(chunkLayers('full', false)).toEqual({ root: true, near: false, far: true });
  });

  it('shouldShowOnlyTheFarBlocksFromAfarAndNothingOutOfView', () => {
    expect(chunkLayers('coarse', true)).toEqual({ root: true, near: false, far: true });
    expect(chunkLayers('hidden', true).root).toBe(false);
  });
});
