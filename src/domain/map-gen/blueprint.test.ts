import { describe, expect, it } from 'vitest';
import { pieceRect, STORY_HEIGHT_STEPS } from '../map-v2';
import { buildBlueprint, doorOutside, rotateBlueprint, type BuildingSpec } from './blueprint';
import { roofFor, STYLE_KITS } from './kits';

const medieval = STYLE_KITS.medieval;
const modern = STYLE_KITS.modern;

function spec(overrides: Partial<BuildingSpec> = {}): BuildingSpec {
  return {
    width: 6,
    depth: 8,
    stories: 2,
    use: 'house',
    walls: medieval.walls.house[0]!,
    floor: medieval.tiles.indoor[0]!,
    roof: 'gable',
    seed: 1,
    ...overrides,
  };
}

describe('building blueprint', () => {
  it('shouldCloseEveryStoryWithOneDoorOnTheGroundFloorFacingNorth', () => {
    const blueprint = buildBlueprint(spec(), medieval);
    const perimeter = 2 * (6 + 8);
    expect(blueprint.walls).toHaveLength(perimeter * 2);
    const doors = blueprint.walls.filter((wall) => wall.style === medieval.walls.house[0]!.door);
    expect(doors).toEqual([expect.objectContaining({ x: 3, z: 0, side: 'north', level: 0 })]);
    expect(blueprint.walls.every((wall) => wall.height === STORY_HEIGHT_STEPS)).toBe(true);
    expect(blueprint.door).toEqual({ x: 3, z: 0 });
  });

  it('shouldStackStoriesWithStairsAndASlabWithAHole', () => {
    const blueprint = buildBlueprint(spec({ stories: 3 }), medieval);
    const stairs = blueprint.pieces.filter((piece) => piece.key === medieval.stairs.key);
    expect(stairs.map((piece) => piece.level)).toEqual([0, STORY_HEIGHT_STEPS]);
    const slabs = blueprint.pieces.filter(
      (piece) => piece.key === medieval.tiles.indoor[0] && piece.level === STORY_HEIGHT_STEPS,
    );
    const covered = slabs.reduce((sum, piece) => sum + piece.footprint.width ** 2, 0);
    // A laje cobre o andar todo, menos as 3 casas do vão da escada.
    expect(covered).toBe(6 * 8 - 3);
  });

  it('shouldCoverTheWholeHouseWithGableRoofsOnTop', () => {
    const blueprint = buildBlueprint(spec({ stories: 1, width: 6, depth: 6 }), medieval);
    const roofKeys = new Set(medieval.gableRoofs.map((roof) => roof.key));
    const roofs = blueprint.pieces.filter((piece) => roofKeys.has(piece.key));
    const area = roofs.reduce((sum, piece) => {
      const rect = pieceRect(piece);
      return sum + rect.width * rect.depth;
    }, 0);
    expect(area).toBe(36);
    expect(roofs.every((piece) => piece.level === STORY_HEIGHT_STEPS)).toBe(true);
  });

  it('shouldGiveTheModernPlasterHouseItsOwnGableRoofOnEvenSides', () => {
    const plaster = modern.walls.house.find((set) => set.roofs)!;
    expect(roofFor(modern, plaster, { width: 6, depth: 8 })).toBe('gable');
    expect(roofFor(modern, plaster, { width: 5, depth: 8 })).toBe('flat');
    expect(roofFor(modern, modern.walls.house[0]!, { width: 6, depth: 8 })).toBe('flat');
    expect(roofFor(medieval, medieval.walls.house[0]!, { width: 6, depth: 6 })).toBe('gable');
    const blueprint = buildBlueprint(
      spec({ walls: plaster, stories: 1, floor: 'mod-piso-interno' }),
      modern,
    );
    const roofKeys = new Set(plaster.roofs!.map((roof) => roof.key));
    const roofs = blueprint.pieces.filter((piece) => roofKeys.has(piece.key));
    const area = roofs.reduce((sum, piece) => {
      const rect = pieceRect(piece);
      return sum + rect.width * rect.depth;
    }, 0);
    expect(area).toBe(48);
    // Telhado no lugar da laje: nada de piso interno em cima do térreo.
    const slab = blueprint.pieces.filter(
      (piece) => piece.key === 'mod-piso-interno' && piece.level === STORY_HEIGHT_STEPS,
    );
    expect(slab).toHaveLength(0);
  });

  it('shouldUseAFlatRoofSlabAndAShopfrontForModernShops', () => {
    const shop = modern.walls.shop[0]!;
    const blueprint = buildBlueprint(
      spec({ use: 'shop', walls: shop, roof: 'flat', stories: 1, floor: 'mod-piso-interno' }),
      modern,
    );
    expect(blueprint.walls.some((wall) => wall.style === shop.shopfront)).toBe(true);
    const roof = blueprint.pieces.filter(
      (piece) => piece.key === 'mod-piso-interno' && piece.level === STORY_HEIGHT_STEPS,
    );
    expect(roof.reduce((sum, piece) => sum + piece.footprint.width ** 2, 0)).toBe(48);
  });

  it('shouldKeepTheDoorCellsFreeOfFurniture', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const blueprint = buildBlueprint(spec({ seed, stories: 1 }), medieval);
      const inside = blueprint.pieces.filter(
        (piece) => piece.level === 0 && piece.x === 3 && piece.z <= 1,
      );
      expect(inside).toEqual([]);
    }
  });

  it('shouldFallBackToOneStoryWhenThereIsNoRoomForStairs', () => {
    const blueprint = buildBlueprint(spec({ width: 2, depth: 2, stories: 3 }), medieval);
    expect(blueprint.stories).toBe(1);
    expect(blueprint.walls.every((wall) => wall.level === 0)).toBe(true);
  });

  it('shouldRotateWallsPiecesAndDoorTogether', () => {
    const blueprint = buildBlueprint(spec({ width: 4, depth: 6, stories: 1 }), medieval);
    const turned = rotateBlueprint(blueprint, 1);
    expect([turned.width, turned.depth]).toEqual([6, 4]);
    // A porta da face norte vai para a face oeste.
    const door = turned.walls.find((wall) => wall.style === medieval.walls.house[0]!.door);
    expect(door).toMatchObject({ side: 'west', x: 0 });
    expect(turned.door.x).toBe(0);
    expect(doorOutside(blueprint, 1)).toEqual({ x: -1, z: turned.door.z });
    expect(doorOutside(blueprint, 2)).toEqual({ x: 1, z: 6 });
    for (const piece of turned.pieces) {
      const rect = pieceRect(piece);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.z).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(6);
      expect(rect.z + rect.depth).toBeLessThanOrEqual(4);
    }
    expect(rotateBlueprint(blueprint, 4)).toBe(blueprint);
    expect(rotateBlueprint(rotateBlueprint(blueprint, 2), 2)).toEqual(blueprint);
  });
});
