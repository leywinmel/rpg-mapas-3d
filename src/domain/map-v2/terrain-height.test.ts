import { createEmptyMap, getChunk, terrainAt } from './model';
import { paintTerrainCell, placePiece, placeWall } from './operations';
import { setTerrainHeight, stepTerrainHeight } from './terrain-height';
import { changedKeys, errorsOf, makePiece, makeWall, unwrap } from './test-fixtures';
import type { MapModel } from './types';

const size = { width: 100, depth: 100 };
const base = createEmptyMap(size);

function pieceById(model: MapModel, id: string) {
  for (const chunk of model.chunks.values()) {
    const piece = chunk.pieces.find((item) => item.id === id);
    if (piece) return piece;
  }
  throw new Error(`Peça ${id} não encontrada.`);
}

function wallsOf(model: MapModel) {
  return getChunk(model, { cx: 0, cz: 0 }).walls;
}

describe('height brush', () => {
  const cell = { x: 5, z: 5 };
  const one = { from: cell, to: cell };

  it('shouldRaiseAndLowerByStepsStoppingAtTheLimits', () => {
    const raised = unwrap(stepTerrainHeight(base, { ...one, delta: 3 }));
    expect(terrainAt(raised, cell)?.height).toBe(3);
    const lowered = unwrap(stepTerrainHeight(raised, { ...one, delta: -5 }));
    expect(terrainAt(lowered, cell)?.height).toBe(0);
    const top = unwrap(stepTerrainHeight(base, { ...one, delta: 40 }));
    expect(unwrap(stepTerrainHeight(top, { ...one, delta: 1 }))).toBe(top);
    expect(unwrap(stepTerrainHeight(base, { ...one, delta: -1 }))).toBe(base);
    expect(unwrap(stepTerrainHeight(base, { ...one, delta: 0 }))).toBe(base);
  });

  it('shouldRaiseEachCellOfARectangleFromItsOwnHeight', () => {
    const hill = unwrap(setTerrainHeight(base, { ...one, height: 4 }));
    const raised = unwrap(
      stepTerrainHeight(hill, { from: { x: 4, z: 5 }, to: { x: 6, z: 5 }, delta: 2 }),
    );
    expect([4, 5, 6].map((x) => terrainAt(raised, { x, z: 5 })?.height)).toEqual([2, 6, 2]);
  });

  it('shouldSkipHolesAndRejectStepsThatAreNotWhole', () => {
    const hole = unwrap(paintTerrainCell(base, { cell, tile: null }));
    expect(unwrap(stepTerrainHeight(hole, { ...one, delta: 2 }))).toBe(hole);
    for (const delta of [1.5, 41, -41, Number.NaN]) {
      expect(errorsOf(stepTerrainHeight(base, { ...one, delta }))[0]).toMatch(/até 40 degraus/);
    }
  });

  it('shouldCarryAPieceRestingOnTheGround', () => {
    const placed = unwrap(placePiece(base, makePiece({ x: 5, z: 5 })));
    const raised = unwrap(stepTerrainHeight(placed, { ...one, delta: 2 }));
    expect(pieceById(raised, 'barril-1').level).toBe(2);
    const lowered = unwrap(stepTerrainHeight(raised, { ...one, delta: -1 }));
    expect(pieceById(lowered, 'barril-1').level).toBe(1);
    // A peça mora no mesmo pedaço do chão: só ele muda.
    expect(changedKeys(placed, raised)).toEqual(['0,0']);
  });

  it('shouldCarryWithSetTerrainHeightToo', () => {
    const placed = unwrap(placePiece(base, makePiece({ x: 5, z: 5 })));
    const raised = unwrap(setTerrainHeight(placed, { ...one, height: 6 }));
    expect(pieceById(raised, 'barril-1').level).toBe(6);
  });

  it('shouldLeaveAStackedPieceWhereItIs', () => {
    const placed = unwrap(placePiece(base, makePiece({ x: 5, z: 5, level: 4 })));
    const raised = unwrap(stepTerrainHeight(placed, { ...one, delta: 2 }));
    expect(pieceById(raised, 'barril-1').level).toBe(4);
  });

  it('shouldKeepAWidePieceOnTheHighestCellUnderIt', () => {
    // Carroça 2×1 em (5, 5) e (6, 5): subir uma casa leva a carroça para o topo dela.
    const cart = makePiece({ id: 'carroca', x: 5, z: 5, footprint: { width: 2, depth: 1 } });
    const placed = unwrap(placePiece(base, cart));
    const oneSide = unwrap(stepTerrainHeight(placed, { ...one, delta: 2 }));
    expect(pieceById(oneSide, 'carroca').level).toBe(2);
    // Subir a outra casa até o mesmo degrau não muda nada: ela já estava no ponto mais alto.
    const other = { x: 6, z: 5 };
    const both = unwrap(stepTerrainHeight(oneSide, { from: other, to: other, delta: 2 }));
    expect(pieceById(both, 'carroca').level).toBe(2);
    // Subir as duas juntas sobe a carroça o mesmo tanto.
    const together = unwrap(stepTerrainHeight(both, { from: { x: 5, z: 5 }, to: other, delta: 1 }));
    expect(pieceById(together, 'carroca').level).toBe(3);
  });

  it('shouldCarryAPieceAnchoredInAnotherChunk', () => {
    // Âncora no pedaço (0, 0), avançando para o (1, 0): o pincel em x = 32 a leva junto.
    const cart = makePiece({ id: 'carroca', x: 30, z: 5, footprint: { width: 4, depth: 1 } });
    const placed = unwrap(placePiece(base, cart));
    const edge = { x: 32, z: 5 };
    const raised = unwrap(stepTerrainHeight(placed, { from: edge, to: edge, delta: 1 }));
    expect(pieceById(raised, 'carroca').level).toBe(1);
    expect(changedKeys(placed, raised).sort()).toEqual(['0,0', '1,0']);
  });

  it('shouldCarryWallsRestingOnTheHigherSideOfTheEdge', () => {
    // A aresta norte de (5, 5) separa (5, 4) e (5, 5); a oeste separa (4, 5) e (5, 5).
    let model = unwrap(placeWall(base, makeWall({ x: 5, z: 5, side: 'north' })));
    model = unwrap(placeWall(model, makeWall({ x: 5, z: 5, side: 'west' })));
    model = unwrap(placeWall(model, makeWall({ x: 6, z: 5, side: 'west' })));
    model = unwrap(placeWall(model, makeWall({ x: 5, z: 6, side: 'north' })));
    model = unwrap(placeWall(model, makeWall({ x: 9, z: 9, side: 'north' })));
    const raised = unwrap(stepTerrainHeight(model, { ...one, delta: 3 }));
    expect(wallsOf(raised).map((wall) => wall.level)).toEqual([3, 3, 3, 3, 0]);
    // Descer a casa vizinha mais baixa não mexe na parede, que continua apoiada na mais alta.
    const neighbor = { x: 5, z: 4 };
    const lowered = unwrap(stepTerrainHeight(raised, { from: neighbor, to: neighbor, delta: -1 }));
    expect(wallsOf(lowered)[0]?.level).toBe(3);
  });

  it('shouldLeaveTheUpperFloorWallWhereItIs', () => {
    let model = unwrap(placeWall(base, makeWall({ x: 5, z: 5 })));
    model = unwrap(placeWall(model, makeWall({ x: 5, z: 5, level: 8, height: 4 })));
    const raised = unwrap(stepTerrainHeight(model, { ...one, delta: 2 }));
    expect(wallsOf(raised).map((wall) => wall.level)).toEqual([2, 8]);
  });

  it('shouldCarryAWallOnTheEastAndSouthBorderOfTheMap', () => {
    const corner = { x: 99, z: 99 };
    let model = unwrap(placeWall(base, makeWall({ x: 100, z: 99, side: 'west' })));
    model = unwrap(placeWall(model, makeWall({ x: 99, z: 100, side: 'north' })));
    const raised = unwrap(stepTerrainHeight(model, { from: corner, to: corner, delta: 1 }));
    expect(getChunk(raised, { cx: 3, cz: 3 }).walls.map((wall) => wall.level)).toEqual([1, 1]);
  });
});
