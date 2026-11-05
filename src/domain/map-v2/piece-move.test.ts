import { createEmptyMap, getChunk } from './model';
import { paintTerrainCell, placePiece } from './operations';
import {
  findPiece,
  findPieceById,
  movedPieces,
  movePiece,
  pieceMovedMessageSchema,
  sameSpot,
  spotOf,
} from './piece-move';
import { errorsOf, makePiece, unwrap } from './test-fixtures';

const size = { width: 100, depth: 100 };
const car = makePiece({
  id: 'carro-1',
  asset: { source: 'catalog', key: 'mod-carro' },
  x: 2,
  z: 2,
  footprint: { width: 2, depth: 4 },
});
const withCar = unwrap(placePiece(createEmptyMap(size), car));

describe('movePiece', () => {
  it('shouldMoveThePieceToTheNewSpotKeepingEverythingElse', () => {
    const moved = unwrap(movePiece(withCar, car, { x: 10, z: 5, rotation: 1, level: 2 }));
    expect(findPiece(moved, { id: car.id, x: 10, z: 5 })).toEqual({
      ...car,
      x: 10,
      z: 5,
      rotation: 1,
      level: 2,
    });
    // Um carro só: o do lugar novo (o antigo saiu do pedaço).
    expect(getChunk(moved, { cx: 0, cz: 0 }).pieces).toHaveLength(1);
  });

  it('shouldMoveThePieceToTheChunkOfTheNewAnchor', () => {
    const moved = unwrap(movePiece(withCar, car, { ...spotOf(car), x: 40 }));
    expect(getChunk(moved, { cx: 0, cz: 0 }).pieces).toHaveLength(0);
    expect(getChunk(moved, { cx: 1, cz: 0 }).pieces.map((piece) => piece.id)).toEqual([car.id]);
  });

  it('shouldReturnTheSameModelWhenThePieceIsAlreadyThere', () => {
    expect(unwrap(movePiece(withCar, car, spotOf(car)))).toBe(withCar);
  });

  it('shouldRefuseASpotOutsideTheMap', () => {
    const result = movePiece(withCar, car, { ...spotOf(car), x: 99 });
    expect(errorsOf(result)[0]).toMatch(/não cabe/);
  });

  it('shouldRefuseAPieceThatIsGone', () => {
    const result = movePiece(withCar, { id: 'sumiu', x: 2, z: 2 }, spotOf(car));
    expect(errorsOf(result)[0]).toMatch(/não está mais/);
  });

  it('shouldPutTheMovedPieceAtTheEndOfItsChunk', () => {
    const barrel = makePiece({ id: 'barril', x: 8, z: 8 });
    const both = unwrap(placePiece(withCar, barrel));
    const moved = unwrap(movePiece(both, car, { ...spotOf(car), x: 4 }));
    expect(getChunk(moved, { cx: 0, cz: 0 }).pieces.map((piece) => piece.id)).toEqual([
      'barril',
      car.id,
    ]);
  });
});

describe('findPieceById', () => {
  it('shouldFindThePieceInAnyChunk', () => {
    const moved = unwrap(movePiece(withCar, car, { ...spotOf(car), x: 70, z: 70 }));
    expect(findPieceById(moved, car.id)?.x).toBe(70);
    expect(findPieceById(moved, 'outra')).toBeUndefined();
  });
});

describe('movedPieces', () => {
  it('shouldListThePiecesThatChangedSpot', () => {
    const moved = unwrap(movePiece(withCar, car, { ...spotOf(car), x: 40, rotation: 1 }));
    const moves = movedPieces(withCar, moved);
    expect(moves).toHaveLength(1);
    expect(moves[0]!.before).toEqual(car);
    expect(spotOf(moves[0]!.after)).toEqual({ x: 40, z: 2, rotation: 1, level: 0 });
  });

  it('shouldIgnoreAddedRemovedAndPaintedChanges', () => {
    const added = unwrap(placePiece(withCar, makePiece({ id: 'novo', x: 50, z: 50 })));
    const painted = unwrap(paintTerrainCell(added, { cell: { x: 3, z: 3 }, tile: 'grama' }));
    expect(movedPieces(withCar, painted)).toEqual([]);
    expect(movedPieces(withCar, withCar)).toEqual([]);
  });

  it('shouldIgnoreAMapOfAnotherSize', () => {
    const other = unwrap(placePiece(createEmptyMap({ width: 50, depth: 50 }), car));
    expect(movedPieces(withCar, other)).toEqual([]);
  });
});

describe('sameSpot', () => {
  it('shouldCompareAnchorRotationAndLevel', () => {
    expect(sameSpot(car, { ...spotOf(car) })).toBe(true);
    expect(sameSpot(car, { ...spotOf(car), level: 1 })).toBe(false);
  });
});

describe('pieceMovedMessageSchema', () => {
  const message = {
    mapId: '00000000-0000-4000-8000-000000000001',
    pieceId: car.id,
    from: spotOf(car),
    to: { x: 5, z: 6, rotation: 3, level: 1 },
  };

  it('shouldAcceptAValidMessageAndDropUnknownFields', () => {
    const parsed = pieceMovedMessageSchema.parse({ ...message, asset: 'segredo' });
    expect(parsed).toEqual(message);
  });

  it('shouldRefuseBrokenMessages', () => {
    expect(pieceMovedMessageSchema.safeParse({ ...message, mapId: 'x' }).success).toBe(false);
    expect(
      pieceMovedMessageSchema.safeParse({ ...message, to: { ...message.to, rotation: 4 } }).success,
    ).toBe(false);
    expect(
      pieceMovedMessageSchema.safeParse({ ...message, to: { ...message.to, x: -1 } }).success,
    ).toBe(false);
    expect(pieceMovedMessageSchema.safeParse({ ...message, pieceId: '' }).success).toBe(false);
  });
});
