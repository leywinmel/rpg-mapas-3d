import type { GridSize } from '../grid';
import { chunkKey } from './chunks';
import { MAX_FOOTPRINT } from './constants';
import {
  anchorWindow,
  chunksTouchedByPiece,
  occupiedCells,
  pieceFitsInMap,
  pieceOwnerChunk,
  pieceRect,
  rotatedFootprint,
  type PiecePlacement,
} from './footprint';
import { createEmptyMap, piecesOccupyingCell } from './model';
import type { MapPiece } from './schema';
import type { MapModel } from './types';

function placement(overrides: Partial<PiecePlacement> = {}): PiecePlacement {
  return { x: 10, z: 20, rotation: 0, footprint: { width: 2, depth: 4 }, ...overrides };
}

function piece(overrides: Partial<MapPiece> = {}): MapPiece {
  return {
    id: 'carro-1',
    asset: { source: 'catalog', key: 'carro' },
    x: 10,
    z: 20,
    level: 0,
    rotation: 0,
    footprint: { width: 2, depth: 4 },
    scale: 1,
    ...overrides,
  };
}

/** Põe as peças direto no pedaço da âncora; as operações de verdade só chegam na parte 4. */
function mapWithPieces(size: GridSize, pieces: MapPiece[]): MapModel {
  const base = createEmptyMap(size);
  const chunks = new Map(base.chunks);
  for (const item of pieces) {
    const key = chunkKey(pieceOwnerChunk(item));
    const chunk = chunks.get(key)!;
    chunks.set(key, { ...chunk, pieces: [...chunk.pieces, item] });
  }
  return { ...base, chunks };
}

describe('piece footprint', () => {
  it('shouldSwapWidthAndDepthOnOddQuarterTurns', () => {
    const car = { width: 2, depth: 4 };
    expect([0, 1, 2, 3].map((turns) => rotatedFootprint(car, turns))).toEqual([
      { width: 2, depth: 4 },
      { width: 4, depth: 2 },
      { width: 2, depth: 4 },
      { width: 4, depth: 2 },
    ]);
    expect(rotatedFootprint({ width: 3, depth: 3 }, 1)).toEqual({ width: 3, depth: 3 });
  });

  it('shouldAnchorTheRectangleAtItsLowestXAndZInEveryRotation', () => {
    expect(pieceRect(placement())).toEqual({ x: 10, z: 20, width: 2, depth: 4 });
    expect(pieceRect(placement({ rotation: 1 }))).toEqual({ x: 10, z: 20, width: 4, depth: 2 });
  });

  it('shouldListTheOccupiedCellsRowByRow', () => {
    const cells = occupiedCells(placement({ x: 5, z: 6, footprint: { width: 2, depth: 3 } }));
    expect(cells).toEqual([
      { x: 5, z: 6 },
      { x: 6, z: 6 },
      { x: 5, z: 7 },
      { x: 6, z: 7 },
      { x: 5, z: 8 },
      { x: 6, z: 8 },
    ]);
    const turned = occupiedCells(
      placement({ x: 5, z: 6, rotation: 1, footprint: { width: 2, depth: 3 } }),
    );
    expect(turned).toHaveLength(6);
    expect(turned.at(-1)).toEqual({ x: 7, z: 7 });
  });

  it('shouldSingleOutAOneCellPiece', () => {
    expect(occupiedCells(placement({ footprint: { width: 1, depth: 1 } }))).toEqual([
      { x: 10, z: 20 },
    ]);
  });
});

describe('piece fits in the map', () => {
  const size = { width: 10, depth: 6 };

  it('shouldAcceptAPieceThatTouchesTheBorder', () => {
    expect(pieceFitsInMap(size, placement({ x: 8, z: 2 }))).toBe(true);
    expect(pieceFitsInMap(size, placement({ x: 0, z: 0 }))).toBe(true);
  });

  it('shouldRejectAPieceThatPassesTheBorder', () => {
    expect(pieceFitsInMap(size, placement({ x: 9, z: 0 }))).toBe(false);
    expect(pieceFitsInMap(size, placement({ x: 0, z: 3 }))).toBe(false);
  });

  it('shouldRejectAPieceThatLeavesTheMapWhenRotated', () => {
    const car = placement({ x: 8, z: 0 });
    expect(pieceFitsInMap(size, car)).toBe(true);
    expect(pieceFitsInMap(size, { ...car, rotation: 1 })).toBe(false);
    expect(pieceFitsInMap(size, { ...car, rotation: 2 })).toBe(true);
  });

  it('shouldRejectAnchorsOutsideOrNotWhole', () => {
    expect(pieceFitsInMap(size, placement({ x: -1, z: 0 }))).toBe(false);
    expect(pieceFitsInMap(size, placement({ x: 0, z: 0.5 }))).toBe(false);
  });
});

describe('chunks of a piece', () => {
  const size = { width: 100, depth: 100 };

  it('shouldOwnThePieceByItsAnchorEvenWhenItAdvancesIntoTheNeighbor', () => {
    expect(pieceOwnerChunk({ x: 30, z: 5 })).toEqual({ cx: 0, cz: 0 });
    expect(pieceOwnerChunk({ x: 32, z: 5 })).toEqual({ cx: 1, cz: 0 });
  });

  it('shouldTouchASingleChunkWhenThePieceStaysInside', () => {
    expect(chunksTouchedByPiece(size, placement({ x: 3, z: 3 }))).toEqual([{ cx: 0, cz: 0 }]);
  });

  it('shouldTouchTheNeighborsThePieceAdvancesInto', () => {
    const east = placement({ x: 31, z: 5, footprint: { width: 2, depth: 1 } });
    expect(chunksTouchedByPiece(size, east)).toEqual([
      { cx: 0, cz: 0 },
      { cx: 1, cz: 0 },
    ]);
    const south = placement({ x: 5, z: 31, footprint: { width: 1, depth: 2 } });
    expect(chunksTouchedByPiece(size, south)).toEqual([
      { cx: 0, cz: 0 },
      { cx: 0, cz: 1 },
    ]);
  });

  it('shouldTouchFourChunksOnACornerWithTheOwnerFirst', () => {
    const corner = placement({ x: 31, z: 31, footprint: { width: 2, depth: 2 } });
    expect(chunksTouchedByPiece(size, corner)).toEqual([
      { cx: 0, cz: 0 },
      { cx: 1, cz: 0 },
      { cx: 0, cz: 1 },
      { cx: 1, cz: 1 },
    ]);
  });

  it('shouldFollowTheRotation', () => {
    const car = placement({ x: 30, z: 5, footprint: { width: 4, depth: 2 } });
    expect(chunksTouchedByPiece(size, car)).toHaveLength(2);
    // Girada, ocupa 2 de largura por 4 de profundidade e fica toda no pedaço de origem.
    expect(chunksTouchedByPiece(size, { ...car, rotation: 1 })).toEqual([{ cx: 0, cz: 0 }]);
  });

  it('shouldIgnoreThePartOutsideTheMap', () => {
    const edge = placement({ x: 68, z: 10, footprint: { width: 4, depth: 1 } });
    expect(chunksTouchedByPiece({ width: 70, depth: 40 }, edge)).toEqual([{ cx: 2, cz: 0 }]);
  });
});

describe('pieces that occupy a cell', () => {
  const size = { width: 100, depth: 100 };

  it('shouldFindAPieceAnchoredInTheNeighborChunkToTheWest', () => {
    const car = piece({ x: 30, z: 5, footprint: { width: 4, depth: 2 } });
    const map = mapWithPieces(size, [car]);
    expect(piecesOccupyingCell(map, { x: 33, z: 6 })).toEqual([car]);
    expect(piecesOccupyingCell(map, { x: 30, z: 5 })).toEqual([car]);
    expect(piecesOccupyingCell(map, { x: 34, z: 6 })).toEqual([]);
    expect(piecesOccupyingCell(map, { x: 29, z: 5 })).toEqual([]);
    expect(piecesOccupyingCell(map, { x: 33, z: 7 })).toEqual([]);
  });

  it('shouldReachTheLargestFootprintFromSevenCellsAway', () => {
    const tree = piece({ id: 'arvore-1', x: 25, z: 25, footprint: { width: 8, depth: 8 } });
    const map = mapWithPieces(size, [tree]);
    // A casa (32, 32) é do pedaço (1, 1) e a âncora (25, 25) está 7 casas a oeste e ao norte.
    expect(MAX_FOOTPRINT - 1).toBe(7);
    expect(piecesOccupyingCell(map, { x: 32, z: 32 })).toEqual([tree]);
    expect(piecesOccupyingCell(map, { x: 32, z: 25 })).toEqual([tree]);
    expect(piecesOccupyingCell(map, { x: 25, z: 32 })).toEqual([tree]);
    expect(piecesOccupyingCell(map, { x: 33, z: 32 })).toEqual([]);
  });

  it('shouldReturnStackedPiecesFromBottomToTop', () => {
    const roof = piece({ id: 'telhado', x: 3, z: 3, level: 8, footprint: { width: 2, depth: 2 } });
    const wall = piece({ id: 'casa', x: 3, z: 3, level: 0, footprint: { width: 2, depth: 2 } });
    const floor = piece({ id: 'sobrado', x: 3, z: 3, level: 4, footprint: { width: 1, depth: 1 } });
    const map = mapWithPieces(size, [roof, wall, floor]);
    const ids = piecesOccupyingCell(map, { x: 3, z: 3 }).map((item) => item.id);
    expect(ids).toEqual(['casa', 'sobrado', 'telhado']);
  });

  it('shouldKeepInsertionOrderAtTheSameLevel', () => {
    const first = piece({ id: 'a', x: 3, z: 3, footprint: { width: 1, depth: 1 } });
    const second = piece({ id: 'b', x: 3, z: 3, footprint: { width: 1, depth: 1 } });
    const map = mapWithPieces(size, [first, second]);
    expect(piecesOccupyingCell(map, { x: 3, z: 3 }).map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('shouldWorkNextToTheMapOrigin', () => {
    const fountain = piece({ id: 'fonte', x: 0, z: 0, footprint: { width: 3, depth: 3 } });
    const map = mapWithPieces(size, [fountain]);
    expect(piecesOccupyingCell(map, { x: 2, z: 2 })).toEqual([fountain]);
    expect(anchorWindow({ x: 2, z: 2 })).toEqual({ x: 0, z: 0, width: 3, depth: 3 });
  });

  it('shouldSearchOnlySevenCellsBackAndNeverOutsideTheMap', () => {
    expect(anchorWindow({ x: 40, z: 5 })).toEqual({ x: 33, z: 0, width: 8, depth: 6 });
    const map = mapWithPieces(size, [piece({ x: 3, z: 3 })]);
    expect(piecesOccupyingCell(map, { x: -1, z: 0 })).toEqual([]);
    expect(piecesOccupyingCell(map, { x: 100, z: 0 })).toEqual([]);
  });
});
