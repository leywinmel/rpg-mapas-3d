import { describe, expect, it } from 'vitest';
import { createEmptyMap, setTerrainHeight, terrainAt, type MapModel } from '@/domain/map-v2';
import {
  eraseTarget,
  eraseTargetAt,
  findPiece,
  pieceFor,
  placePieceAt,
  placeWallAt,
  rotatePiece,
  setAmbience,
  wallFor,
  wallsOnEdge,
} from './model-ops';

const SIZE = { width: 6, depth: 4 };
const BARREL = { source: 'catalog', key: 'barril' } as const;
const CENTER = { x: 0.5, z: 0.5 };

function ok(result: { ok: true; value: MapModel } | { ok: false; errors: string[] }): MapModel {
  if (!result.ok) throw new Error(result.errors.join(' | '));
  return result.value;
}

function hill(model: MapModel, x: number, z: number, height: number): MapModel {
  return ok(setTerrainHeight(model, { from: { x, z }, to: { x, z }, height }));
}

const draft = (overrides: Partial<Parameters<typeof pieceFor>[1]> = {}) => ({
  id: 'p1',
  asset: BARREL,
  anchor: { x: 1, z: 1 },
  rotation: 0,
  footprint: { width: 1, depth: 1 },
  ...overrides,
});

describe('model-ops', () => {
  it('shouldRestANewPieceOnTheHighestCellItCovers', () => {
    const model = hill(createEmptyMap(SIZE), 2, 1, 3);
    expect(pieceFor(model, draft()).level).toBe(0);
    expect(pieceFor(model, draft({ footprint: { width: 2, depth: 1 } })).level).toBe(3);
    // Girar 1 quarto troca largura e profundidade: a peça 2×1 passa a ocupar (1, 1) e (1, 2).
    const turned = pieceFor(model, draft({ rotation: 5, footprint: { width: 2, depth: 1 } }));
    expect(turned).toMatchObject({ rotation: 1, level: 0 });
  });

  it('shouldRestANewWallOnTheHigherSideOfTheEdge', () => {
    const model = hill(createEmptyMap(SIZE), 1, 0, 2);
    const edge = { x: 1, z: 1, side: 'north' } as const;
    expect(wallFor(model, { edge, style: 'parede-pedra', height: 4 }).level).toBe(2);
  });

  it('shouldRotateAWidePieceOnItsAnchorAndRefuseWhenItWouldLeaveTheMap', () => {
    const wide = { footprint: { width: 2, depth: 1 } };
    const model = ok(placePieceAt(createEmptyMap(SIZE), draft(wide)));
    const turned = ok(rotatePiece(model, { id: 'p1', x: 1, z: 1 }));
    expect(findPiece(turned, { id: 'p1', x: 1, z: 1 })?.rotation).toBe(1);
    const atEdge = ok(
      placePieceAt(createEmptyMap(SIZE), draft({ ...wide, anchor: { x: 4, z: 3 } })),
    );
    expect(rotatePiece(atEdge, { id: 'p1', x: 4, z: 3 }).ok).toBe(false);
    expect(ok(rotatePiece(model, { id: 'outra', x: 1, z: 1 }))).toBe(model);
  });

  it('shouldEraseTheTopWallThenTheTopPieceThenTheFloor', () => {
    let model = ok(placePieceAt(createEmptyMap(SIZE), draft({ anchor: { x: 0, z: 0 } })));
    const edge = { x: 0, z: 0, side: 'west' } as const;
    model = ok(placeWallAt(model, { edge, style: 'parede-pedra', height: 4 }));
    model = ok(placeWallAt(model, { edge, style: 'parede-madeira', height: 4 }));
    const nearWall = { cell: { x: 0, z: 0 }, point: { x: 0.05, z: 0.5 } };
    // A segunda parede substituiu a primeira (mesmo trecho de altura).
    expect(wallsOnEdge(model, edge).map((wall) => wall.style)).toEqual(['parede-madeira']);
    const wallTarget = eraseTargetAt(model, nearWall);
    expect(wallTarget?.layer).toBe('wall');
    model = ok(eraseTarget(model, wallTarget!));
    const pieceTarget = eraseTargetAt(model, { cell: { x: 0, z: 0 }, point: CENTER });
    expect(pieceTarget?.layer).toBe('piece');
    model = ok(eraseTarget(model, pieceTarget!));
    const floorTarget = eraseTargetAt(model, { cell: { x: 0, z: 0 }, point: CENTER });
    expect(floorTarget).toEqual({ layer: 'floor', cell: { x: 0, z: 0 } });
    model = ok(eraseTarget(model, floorTarget!));
    expect(terrainAt(model, { x: 0, z: 0 })?.tile).toBeNull();
    expect(eraseTargetAt(model, { cell: { x: 0, z: 0 }, point: CENTER })).toBeNull();
  });

  it('shouldKeepTheSameModelWhenTheAmbienceDoesNotChange', () => {
    const model = createEmptyMap(SIZE);
    expect(setAmbience(model, { light: model.header.ambience.light })).toBe(model);
    expect(setAmbience(model, { light: 1.2 }).header.ambience.light).toBe(1.2);
  });
});
