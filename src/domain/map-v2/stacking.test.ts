import { createEmptyMap } from './model';
import { placePiece, placeWall } from './operations';
import { stackedPieceLevel, type PieceHeightOf } from './stacking';
import { setTerrainHeight } from './terrain-height';
import { makePiece, makeWall, unwrap } from './test-fixtures';

const base = createEmptyMap({ width: 64, depth: 64 });
const twoStepsTall: PieceHeightOf = () => 2;
const oneCell = { x: 3, z: 4, rotation: 0, footprint: { width: 1, depth: 1 } };

describe('stacked piece level', () => {
  it('shouldRestOnTheFloorWhenTheCellIsEmpty', () => {
    const hill = unwrap(setTerrainHeight(base, { from: oneCell, to: oneCell, height: 3 }));
    expect(stackedPieceLevel(base, { placement: oneCell, heightOf: twoStepsTall })).toBe(0);
    expect(stackedPieceLevel(hill, { placement: oneCell, heightOf: twoStepsTall })).toBe(3);
  });

  it('shouldLandOnTopOfTheTallestPieceBelow', () => {
    const table = unwrap(placePiece(base, makePiece({ id: 'mesa', level: 1 })));
    expect(stackedPieceLevel(table, { placement: oneCell, heightOf: twoStepsTall })).toBe(3);
    const wide = { ...oneCell, x: 2, footprint: { width: 3, depth: 1 } };
    expect(stackedPieceLevel(table, { placement: wide, heightOf: twoStepsTall })).toBe(3);
  });

  it('shouldIgnoreThePieceItself', () => {
    const table = unwrap(placePiece(base, makePiece({ id: 'mesa' })));
    const query = { placement: oneCell, heightOf: twoStepsTall, ignoreId: 'mesa' };
    expect(stackedPieceLevel(table, query)).toBe(0);
  });

  it('shouldLandOnAWallInsideTheRectangleButNotOnTheBorderOnes', () => {
    const slab = { x: 0, z: 0, rotation: 0, footprint: { width: 3, depth: 3 } };
    const inner = unwrap(placeWall(base, makeWall({ x: 0, z: 1, side: 'north', height: 4 })));
    expect(stackedPieceLevel(inner, { placement: slab, heightOf: twoStepsTall })).toBe(4);
    const border = unwrap(placeWall(base, makeWall({ x: 0, z: 0, side: 'north', height: 4 })));
    expect(stackedPieceLevel(border, { placement: slab, heightOf: twoStepsTall })).toBe(0);
    const east = unwrap(placeWall(base, makeWall({ x: 3, z: 1, side: 'west', height: 4 })));
    expect(stackedPieceLevel(east, { placement: slab, heightOf: twoStepsTall })).toBe(0);
    const innerWest = unwrap(placeWall(base, makeWall({ x: 2, z: 1, side: 'west', height: 6 })));
    expect(stackedPieceLevel(innerWest, { placement: slab, heightOf: twoStepsTall })).toBe(6);
  });
});
