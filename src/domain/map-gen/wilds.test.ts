import { describe, expect, it } from 'vitest';
import { parseChunk, serializeChunk, terrainAt, type MapModel, type MapPiece } from '../map-v2';
import { sizePreset } from './presets';
import { generateWilds, planWilds, WILD_KINDS, type WildPlan } from './wilds';

const VILLAGE = sizePreset('village');
const SIZE = { width: VILLAGE.side, depth: VILLAGE.side };

function allPieces(model: MapModel): MapPiece[] {
  return [...model.chunks.values()].flatMap((chunk) => chunk.pieces);
}

function keysOf(plan: WildPlan): Set<string> {
  return new Set(plan.pieces.map((piece) => piece.key));
}

/** Casas de chão alcançáveis a partir da primeira, andando só por chão. */
function reachable(plan: WildPlan): { reached: number; open: number } {
  const { width, depth } = plan.size;
  const open = plan.tiles.filter((tile) => tile !== null).length;
  const start = plan.tiles.findIndex((tile) => tile !== null);
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cell = queue.pop()!;
    const x = cell % width;
    const z = Math.floor(cell / width);
    for (const [nx, nz] of [
      [x + 1, z],
      [x - 1, z],
      [x, z + 1],
      [x, z - 1],
    ] as const) {
      if (nx < 0 || nz < 0 || nx >= width || nz >= depth) continue;
      const next = nz * width + nx;
      if (seen.has(next) || plan.tiles[next] === null) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return { reached: seen.size, open };
}

describe('wilds generator', () => {
  it.each(WILD_KINDS)('shouldMakeChunksTheDomainAccepts (%s)', (kind) => {
    const { model, stats } = generateWilds({ kind, size: SIZE, seed: 7 });
    expect(stats.dropped).toBe(0);
    expect(stats.pieces).toBeGreaterThan(0);
    for (const chunk of model.chunks.values()) {
      const parsed = parseChunk(JSON.parse(JSON.stringify(serializeChunk(chunk))), {
        size: model.size,
        coord: chunk.coord,
      });
      expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    }
  });

  it.each(WILD_KINDS)('shouldRepeatTheSameMapForTheSameSeed (%s)', (kind) => {
    const first = planWilds({ kind, size: SIZE, seed: 42 });
    const again = planWilds({ kind, size: SIZE, seed: 42 });
    const other = planWilds({ kind, size: SIZE, seed: 43 });
    expect(again).toEqual(first);
    expect(other.tiles).not.toEqual(first.tiles);
  });

  // Ninguém pode nascer numa sala sem saída: todo chão da masmorra e da caverna se alcança.
  it.each(['dungeon', 'cave'] as const)('shouldConnectEveryFloorCell (%s)', (kind) => {
    const { reached, open } = reachable(planWilds({ kind, size: SIZE, seed: 11 }));
    expect(open).toBeGreaterThan(SIZE.width);
    expect(reached).toBe(open);
  });

  it('shouldBuildDungeonRoomsWithStoneFloorWallsAndTorches', () => {
    const plan = planWilds({ kind: 'dungeon', size: SIZE, seed: 3 });
    expect(plan.features).toBeGreaterThan(1);
    expect(plan.tiles).toContain('piso-pedra');
    expect(plan.tiles).toContain(null);
    expect(plan.walls.length).toBeGreaterThan(0);
    expect(plan.walls.every((wall) => wall.style === 'parede-pedra')).toBe(true);
    expect(keysOf(plan).has('tocha')).toBe(true);
    // Rocha maciça vira casa sem chão no mapa, não um piso escondido.
    const { model } = generateWilds({ kind: 'dungeon', size: SIZE, seed: 3 });
    expect(terrainAt(model, { x: 0, z: 0 })?.tile).toBeNull();
  });

  it('shouldKeepTheMapBorderAsSolidRockInCaves', () => {
    const plan = planWilds({ kind: 'cave', size: SIZE, seed: 9 });
    const { width, depth } = SIZE;
    for (let x = 0; x < width; x += 1) {
      expect(plan.tiles[x]).toBeNull();
      expect(plan.tiles[(depth - 1) * width + x]).toBeNull();
    }
    expect(keysOf(plan).has('rocha')).toBe(true);
  });

  it('shouldCoverTheDesertWithSandAndScatterRuins', () => {
    const { model } = generateWilds({ kind: 'desert', size: SIZE, seed: 5 });
    expect(terrainAt(model, { x: 0, z: 0 })?.tile).toMatch(/areia|chao-rachado|agua|piso-pedra/);
    const keys = new Set(
      allPieces(model).map((piece) => piece.asset.source === 'catalog' && piece.asset.key),
    );
    expect(keys.has('rocha')).toBe(true);
    expect(planWilds({ kind: 'desert', size: SIZE, seed: 5 }).tiles).not.toContain(null);
  });

  it('shouldFallBackToPlainFloorOnTinyMaps', () => {
    const plan = planWilds({ kind: 'dungeon', size: { width: 5, depth: 5 }, seed: 1 });
    expect(plan.tiles.every((tile) => tile === 'piso-pedra')).toBe(true);
  });

  it('shouldRejectAnInvalidSize', () => {
    expect(() => generateWilds({ kind: 'cave', size: { width: 0, depth: 10 }, seed: 1 })).toThrow(
      RangeError,
    );
  });

  it('shouldGenerateALargeCaveQuickly', () => {
    const started = performance.now();
    const { stats } = generateWilds({ kind: 'cave', size: { width: 400, depth: 400 }, seed: 2 });
    expect(stats.dropped).toBe(0);
    expect(performance.now() - started).toBeLessThan(5000);
  });
});
