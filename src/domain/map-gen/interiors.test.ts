import { describe, expect, it } from 'vitest';
import { rotatedFootprint } from '../map-v2';
import {
  arrangeInterior,
  INTERIOR_PIECES,
  type InteriorPiece,
  type InteriorRoom,
} from './interiors';

const ROOM: InteriorRoom = {
  width: 12,
  depth: 8,
  door: 6,
  stairs: [
    { x: 11, z: 5 },
    { x: 11, z: 6 },
    { x: 11, z: 7 },
  ],
  story: 0,
};

function cellsOf(piece: InteriorPiece): string[] {
  const size = rotatedFootprint(piece.footprint, piece.rotation);
  const cells: string[] = [];
  for (let dz = 0; dz < size.depth; dz += 1) {
    for (let dx = 0; dx < size.width; dx += 1) cells.push(`${piece.x + dx},${piece.z + dz}`);
  }
  return cells;
}

describe.each(['classroom', 'ward'] as const)('arrangeInterior (%s)', (interior) => {
  const pieces = arrangeInterior(interior, ROOM);
  const cells = pieces.flatMap(cellsOf);

  it('shouldKeepEveryPieceInsideTheRoom', () => {
    for (const cell of cells) {
      const [x, z] = cell.split(',').map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(z).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(ROOM.width);
      expect(z).toBeLessThan(ROOM.depth);
    }
  });

  it('shouldNotOverlapPieces', () => {
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('shouldLeaveTheDoorAndTheStairsFree', () => {
    const blocked = [
      `${ROOM.door},0`,
      `${ROOM.door},1`,
      ...ROOM.stairs.map((c) => `${c.x},${c.z}`),
    ];
    for (const cell of blocked) expect(cells).not.toContain(cell);
  });

  it('shouldArrangeTheSameWayEveryTime', () => {
    expect(arrangeInterior(interior, ROOM)).toEqual(pieces);
  });

  it('shouldLeaveRoomsTooSmallEmpty', () => {
    expect(arrangeInterior(interior, { ...ROOM, width: 5 })).toEqual([]);
  });
});

describe('arrangeInterior: o que cada cômodo tem', () => {
  const keys = (interior: 'classroom' | 'ward', story = 0) =>
    arrangeInterior(interior, { ...ROOM, story }).map((piece) => piece.key);

  it('shouldGiveTheClassroomABoardATeacherDeskAndRowsOfDesks', () => {
    const classroom = keys('classroom');
    expect(classroom).toContain(INTERIOR_PIECES.board);
    expect(classroom).toContain(INTERIOR_PIECES.teacherDesk);
    expect(classroom.filter((key) => key === INTERIOR_PIECES.desk).length).toBeGreaterThan(6);
  });

  it('shouldGiveTheWardBedsAndTheReceptionOnlyOnTheGroundFloor', () => {
    expect(keys('ward').filter((key) => key === INTERIOR_PIECES.bed).length).toBeGreaterThan(2);
    expect(keys('ward')).toContain(INTERIOR_PIECES.reception);
    expect(keys('ward', 1)).not.toContain(INTERIOR_PIECES.reception);
    expect(keys('ward', 1).filter((key) => key === INTERIOR_PIECES.bed).length).toBeGreaterThan(
      keys('ward').filter((key) => key === INTERIOR_PIECES.bed).length,
    );
  });
});
