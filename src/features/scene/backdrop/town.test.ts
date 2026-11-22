import { describe, expect, it } from 'vitest';
import { BACKDROP_MARGIN, townLayout } from './backdrop';
import { TOWN } from './town';

const size = { width: 30, depth: 20 };

describe('town backdrop', () => {
  it('shouldOnlyBuildTheTownForTheCityBackdrop', () => {
    expect(townLayout('forest', size)).toBeNull();
    expect(townLayout('city', size)).not.toBeNull();
  });

  it('shouldPutHousesAndTreesOnlyOutsideTheMap', () => {
    const town = townLayout('city', size)!;
    const items = town.houses.flatMap((group) => group.transforms);
    expect(items.length).toBe(TOWN.maxHouses);
    for (const { x, z } of items) {
      const insideX = x > -BACKDROP_MARGIN && x < size.width + BACKDROP_MARGIN;
      const insideZ = z > -BACKDROP_MARGIN && z < size.depth + BACKDROP_MARGIN;
      expect(insideX && insideZ).toBe(false);
    }
  });

  it('shouldTurnEveryHouseToAStreet', () => {
    const town = townLayout('city', size)!;
    const turns = new Set(town.houses.flatMap((group) => group.transforms.map((t) => t.rotationY)));
    expect([...turns].sort()).toEqual([0, 180]);
  });

  it('shouldMixHousesTownhousesAndTrees', () => {
    const pieces = townLayout('city', size)!.houses.map((group) => group.piece);
    expect(pieces).toEqual(expect.arrayContaining(['casa', 'casa-clara', 'sobrado', 'arvore']));
  });

  it('shouldBuildFewerHousesOnLowQuality', () => {
    const count = (level: 'high' | 'low') =>
      townLayout('city', size, { level })!.houses.flatMap((group) => group.transforms).length;
    expect(count('low')).toBeLessThan(count('high'));
  });

  it('shouldPaveUnderEveryBlockInUse', () => {
    const town = townLayout('city', size)!;
    const [road] = town.roads;
    expect(road).toBeDefined();
    for (const block of town.blocks) {
      expect(block.x).toBeGreaterThan(road!.x);
      expect(block.z).toBeGreaterThan(road!.z);
      expect(block.x + block.width).toBeLessThan(road!.x + road!.width);
      expect(block.z + block.depth).toBeLessThan(road!.z + road!.depth);
    }
  });
});
