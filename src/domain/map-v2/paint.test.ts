import { describe, expect, it } from 'vitest';
import { createEmptyMap, getChunk } from './model';
import { placePiece, placeWall } from './operations';
import { connectedWalls, MAX_CONNECTED_WALLS, updatePiece, updateWalls, withTint } from './paint';
import { pieceSchema, wallSchema, type MapWall } from './schema';
import { changedKeys, makePiece, makeWall, unwrap } from './test-fixtures';
import { multiplyTint, TINT_PALETTE, tintKey } from './tint';
import type { MapModel } from './types';

const size = { width: 100, depth: 100 };
const RED = '#d9937a';

/** Contorno de uma casa de `width`×`depth` a partir de (x, z), num andar. */
function houseWalls(x: number, z: number, width: number, depth: number, level = 0): MapWall[] {
  const walls: MapWall[] = [];
  for (let dx = 0; dx < width; dx += 1) {
    walls.push(makeWall({ x: x + dx, z, side: 'north', level }));
    walls.push(makeWall({ x: x + dx, z: z + depth, side: 'north', level }));
  }
  for (let dz = 0; dz < depth; dz += 1) {
    walls.push(makeWall({ x, z: z + dz, side: 'west', level }));
    walls.push(makeWall({ x: x + width, z: z + dz, side: 'west', level }));
  }
  return walls;
}

function withWalls(walls: readonly MapWall[]): MapModel {
  return walls.reduce((model, wall) => unwrap(placeWall(model, wall)), createEmptyMap(size));
}

describe('tinta', () => {
  it('shouldMultiplyEachChannelLikeTheScene', () => {
    expect(multiplyTint('#ffffff', '#336699')).toBe('#336699');
    expect(multiplyTint('#808080', '#ff0000')).toBe('#800000');
    expect(multiplyTint('#123456', undefined)).toBe('#123456');
  });

  it('shouldKeepEveryPaletteColorValidForTheMapFormat', () => {
    for (const swatch of TINT_PALETTE) {
      expect(wallSchema.safeParse(makeWall({ tint: swatch.color })).success).toBe(true);
    }
    expect(new Set(TINT_PALETTE.map((swatch) => swatch.color)).size).toBe(TINT_PALETTE.length);
  });

  it('shouldRefuseATintThatIsNotAColor', () => {
    expect(wallSchema.safeParse(makeWall({ tint: 'vermelho' })).success).toBe(false);
    expect(pieceSchema.safeParse(makePiece({ tint: '#FFF' })).success).toBe(false);
  });

  it('shouldSeparateDrawGroupsByTint', () => {
    expect(tintKey('parede-pedra', undefined)).toBe('parede-pedra');
    expect(tintKey('parede-pedra', RED)).not.toBe(tintKey('parede-pedra', '#a8bf8f'));
  });

  it('shouldDropTheFieldWhenTheTintIsRemoved', () => {
    const painted = withTint(makeWall(), RED);
    expect(painted.tint).toBe(RED);
    expect('tint' in withTint(painted, null)).toBe(false);
  });
});

describe('connectedWalls', () => {
  it('shouldFindTheWholeHouseFromOneWallAcrossStories', () => {
    const house = [...houseWalls(10, 10, 4, 3), ...houseWalls(10, 10, 4, 3, 8)];
    const model = withWalls([...house, ...houseWalls(30, 10, 2, 2)]);
    const found = connectedWalls(model, { x: 11, z: 10, side: 'north', level: 0 });
    expect(found).toHaveLength(house.length);
  });

  it('shouldReturnNothingWithoutAWallAtTheStart', () => {
    expect(connectedWalls(withWalls(houseWalls(10, 10, 2, 2)), makeWall({ x: 50 }))).toEqual([]);
  });

  it('shouldStopAtTheCeiling', () => {
    const line = Array.from({ length: 99 }, (_, x) =>
      Array.from({ length: 50 }, (_, z) => makeWall({ x, z: z * 2, side: 'west' })),
    ).flat();
    const model = withWalls([
      ...line,
      ...line.map((wall) => ({ ...wall, side: 'north' as const })),
    ]);
    expect(connectedWalls(model, line[0]!).length).toBeLessThanOrEqual(MAX_CONNECTED_WALLS);
  });
});

describe('updateWalls e updatePiece', () => {
  it('shouldPaintOnlyTheChosenWallsAndTouchOnlyTheirChunks', () => {
    const model = withWalls([...houseWalls(2, 2, 2, 2), makeWall({ x: 70, z: 70 })]);
    const house = connectedWalls(model, { x: 2, z: 2, side: 'north', level: 0 });
    const after = unwrap(updateWalls(model, house, (wall) => withTint(wall, RED)));
    expect(changedKeys(model, after)).toEqual(['0,0']);
    expect(getChunk(after, { cx: 0, cz: 0 }).walls.every((wall) => wall.tint === RED)).toBe(true);
    expect(getChunk(after, { cx: 2, cz: 2 }).walls[0]?.tint).toBeUndefined();
  });

  it('shouldReturnTheSameModelWhenNothingChanges', () => {
    const model = withWalls(houseWalls(2, 2, 2, 2));
    const house = connectedWalls(model, { x: 2, z: 2, side: 'north', level: 0 });
    expect(unwrap(updateWalls(model, house, (wall) => withTint(wall, null)))).toBe(model);
  });

  it('shouldRefuseAnUpdateThatBreaksTheFormat', () => {
    const model = withWalls([makeWall()]);
    const result = updateWalls(model, [makeWall()], (wall) => ({ ...wall, tint: 'azul' }));
    expect(result.ok).toBe(false);
  });

  it('shouldTintAPieceAndIgnoreAMissingOne', () => {
    const model = unwrap(placePiece(createEmptyMap(size), makePiece()));
    const painted = unwrap(updatePiece(model, makePiece(), (piece) => withTint(piece, RED)));
    expect(getChunk(painted, { cx: 0, cz: 0 }).pieces[0]?.tint).toBe(RED);
    const missing = makePiece({ id: 'outra' });
    expect(unwrap(updatePiece(model, missing, (piece) => withTint(piece, RED)))).toBe(model);
  });

  it('shouldReplaceATintedWallWhenTheSameWallIsDrawnWithoutTint', () => {
    const model = withWalls([makeWall({ tint: RED })]);
    const redrawn = unwrap(placeWall(model, makeWall()));
    expect(getChunk(redrawn, { cx: 0, cz: 0 }).walls[0]?.tint).toBeUndefined();
  });
});
