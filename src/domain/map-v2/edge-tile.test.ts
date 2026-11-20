import type { Cell } from '../grid';
import { dominantEdgeTile } from './edge-tile';
import { createEmptyMap } from './model';
import { paintTerrainRect } from './operations';
import type { MapModel } from './types';
import { unwrap } from './test-fixtures';

const paint = (map: MapModel, from: Cell, to: Cell, tile: string | null) =>
  unwrap(paintTerrainRect(map, { from, to, tile }));

describe('dominantEdgeTile', () => {
  it('shouldReturnTheFloorOfAUniformMap', () => {
    expect(dominantEdgeTile(createEmptyMap({ width: 20, depth: 10 }, 'areia'))).toBe('areia');
  });

  it('shouldPickTheMostCommonFloorOnTheBorderIgnoringTheMiddle', () => {
    const sea = createEmptyMap({ width: 20, depth: 20 }, 'agua');
    const island = paint(sea, { x: 1, z: 1 }, { x: 18, z: 18 }, 'grama');
    const shore = paint(island, { x: 0, z: 0 }, { x: 4, z: 0 }, 'areia');
    expect(dominantEdgeTile(shore)).toBe('agua');
  });

  it('shouldIgnoreCellsWithoutFloor', () => {
    const map = createEmptyMap({ width: 12, depth: 12 }, 'terra');
    expect(dominantEdgeTile(paint(map, { x: 0, z: 0 }, { x: 11, z: 0 }, null))).toBe('terra');
    expect(dominantEdgeTile(paint(map, { x: 0, z: 0 }, { x: 11, z: 11 }, null))).toBeNull();
  });
});
