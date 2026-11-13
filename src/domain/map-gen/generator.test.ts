import { describe, expect, it } from 'vitest';
import {
  loadMapModel,
  parseChunk,
  pieceRect,
  rectContains,
  serializeChunk,
  serializeMapModel,
  terrainAt,
  type MapModel,
  type MapPiece,
} from '../map-v2';
import { generateSettlement } from './generator';
import { STYLE_KITS, SETTLEMENT_STYLES } from './kits';
import { planSettlement, TERRAIN_CLASS } from './layout';
import { EXAMPLE_MAPS, sizePreset, SIZE_PRESETS } from './presets';

const VILLAGE = sizePreset('village');
const TOWN = sizePreset('town');

function allPieces(model: MapModel): MapPiece[] {
  return [...model.chunks.values()].flatMap((chunk) => chunk.pieces);
}

function keyOf(piece: MapPiece): string {
  return piece.asset.source === 'catalog' ? piece.asset.key : '';
}

const side = (preset: typeof VILLAGE) => ({ width: preset.side, depth: preset.side });

describe('settlement generator', () => {
  it.each(SETTLEMENT_STYLES)('shouldMakeChunksTheDomainAccepts (%s)', (style) => {
    const { model, stats } = generateSettlement({ style, size: side(VILLAGE), seed: 5 });
    expect(stats.dropped).toBe(0);
    const ids = new Set<string>();
    for (const chunk of model.chunks.values()) {
      const parsed = parseChunk(JSON.parse(JSON.stringify(serializeChunk(chunk))), {
        size: model.size,
        coord: chunk.coord,
      });
      expect(parsed.ok ? [] : parsed.errors).toEqual([]);
      for (const piece of chunk.pieces) {
        expect(ids.has(piece.id)).toBe(false);
        ids.add(piece.id);
      }
    }
  });

  // Na cidadezinha há prédios encostados pelos fundos: a parede da divisa não pode repetir.
  it.each(SETTLEMENT_STYLES)('shouldSurviveTheRoundTripThroughTheDatabase (%s)', (style) => {
    for (const seed of [2024, 2077, 7]) {
      const { model } = generateSettlement({ style, size: side(TOWN), seed });
      const stored = JSON.parse(JSON.stringify(serializeMapModel(model))) as {
        header: unknown;
        chunks: { coord: { cx: number; cz: number }; document: unknown }[];
      };
      const loaded = loadMapModel({ size: model.size, ...stored });
      expect(loaded.ok ? [] : loaded.errors.slice(0, 3)).toEqual([]);
    }
  });

  it('shouldMakeTheSameMapForTheSameSeed', () => {
    const a = generateSettlement({ style: 'modern', size: side(VILLAGE), seed: 9 });
    const b = generateSettlement({ style: 'modern', size: side(VILLAGE), seed: 9 });
    const c = generateSettlement({ style: 'modern', size: side(VILLAGE), seed: 10 });
    const json = (model: MapModel) =>
      JSON.stringify([...model.chunks.values()].map((chunk) => serializeChunk(chunk)));
    expect(json(a.model)).toBe(json(b.model));
    expect(json(a.model)).not.toBe(json(c.model));
  });

  it('shouldBuildHousesWithDoorsWallsAndRoofsFromTheStyleKit', () => {
    const { model, stats } = generateSettlement({ style: 'medieval', size: side(TOWN), seed: 3 });
    const kit = STYLE_KITS.medieval;
    const walls = [...model.chunks.values()].flatMap((chunk) => chunk.walls);
    const styles = new Set(walls.map((wall) => wall.style));
    expect(stats.buildings).toBeGreaterThan(20);
    expect(styles.has(kit.walls.house[0]!.door)).toBe(true);
    expect(styles.has(kit.walls.house[0]!.window)).toBe(true);
    const keys = new Set(allPieces(model).map(keyOf));
    expect(kit.gableRoofs.some((roof) => keys.has(roof.key))).toBe(true);
    expect(keys.has(kit.plazaCenter)).toBe(true);
    // Andares de cima: paredes empilhadas de 4 em 4 degraus.
    expect(walls.some((wall) => wall.level === 4)).toBe(true);
  });

  it('shouldMixPlasterHousesWithGableRoofsIntoTheModernTown', () => {
    const { model } = generateSettlement({ style: 'modern', size: side(TOWN), seed: 3 });
    const kit = STYLE_KITS.modern;
    const keys = new Set(allPieces(model).map(keyOf));
    const roofs = kit.walls.house.flatMap((set) => set.roofs ?? []);
    expect(roofs.some((roof) => keys.has(roof.key))).toBe(true);
    const styles = new Set(
      [...model.chunks.values()].flatMap((chunk) => chunk.walls).map((wall) => wall.style),
    );
    // A casa de reboco usa janela e porta da mesma cor da parede.
    for (const set of kit.walls.house.filter((house) => house.roofs && styles.has(house.plain))) {
      expect(styles.has(set.window), set.plain).toBe(true);
    }
  });

  it('shouldParkVehiclesInsideTheRoadAndKeepDoorsClear', () => {
    const size = side(TOWN);
    const plan = planSettlement({ style: 'modern', size, seed: 4, profile: TOWN.profile });
    const vehicles = new Set(STYLE_KITS.modern.vehicles.map((vehicle) => vehicle.key));
    const parked = plan.pieces.filter((piece) => vehicles.has(piece.key));
    expect(parked.length).toBeGreaterThan(0);
    for (const piece of parked) {
      const rect = pieceRect({ ...piece });
      for (let z = rect.z; z < rect.z + rect.depth; z += 1) {
        for (let x = rect.x; x < rect.x + rect.width; x += 1) {
          expect(plan.classes[z * size.width + x]).toBe(TERRAIN_CLASS.road);
        }
      }
    }
    const { model } = generateSettlement({ style: 'modern', size, seed: 4 });
    const pieces = allPieces(model).filter((piece) => piece.level === 0);
    // Do lado de fora de cada porta do térreo não há peça nenhuma.
    const doorKeys = new Set(STYLE_KITS.modern.walls.house.map((set) => set.door));
    const doors = [...model.chunks.values()]
      .flatMap((chunk) => chunk.walls)
      .filter((wall) => wall.level === 0 && doorKeys.has(wall.style));
    expect(doors.length).toBeGreaterThan(0);
    for (const door of doors.slice(0, 50)) {
      const sides = [
        { x: door.x, z: door.z },
        door.side === 'north' ? { x: door.x, z: door.z - 1 } : { x: door.x - 1, z: door.z },
      ];
      const outside = sides.find((cell) => terrainAt(model, cell)?.tile !== 'mod-piso-interno');
      if (!outside) continue;
      expect(pieces.some((piece) => rectContains(pieceRect(piece), outside))).toBe(false);
    }
  });

  it('shouldMakeRoadsAtLeastFourCellsWide', () => {
    for (const preset of SIZE_PRESETS) {
      expect(preset.profile.streetWidth).toBeGreaterThanOrEqual(4);
      expect(preset.profile.minGap).toBeGreaterThanOrEqual(1);
    }
  });

  it('shouldMakeTheExampleMapsFromFixedSeeds', () => {
    for (const example of EXAMPLE_MAPS) {
      const preset = sizePreset(example.preset);
      const { stats } = generateSettlement({
        style: example.style,
        size: side(preset),
        seed: example.seed,
      });
      expect(stats.buildings).toBeGreaterThan(0);
      expect(stats.dropped).toBe(0);
    }
  });

  it('shouldRejectAnInvalidSize', () => {
    expect(() =>
      generateSettlement({ style: 'modern', size: { width: 0, depth: 10 }, seed: 1 }),
    ).toThrow(RangeError);
  });
});
