import { describe, expect, it } from 'vitest';
import {
  createEmptyMap,
  getChunk,
  MAX_WALL_HEIGHT_STEPS,
  terrainAt,
  type MapModel,
} from '@/domain/map-v2';
import { canUndo } from './history';
import {
  createEditorState,
  editorReducer,
  type EditorAction,
  type EditorState,
  type PointerHit,
} from './editor-reducer';

const SIZE = { width: 5, depth: 5 };

function hitAt(x: number, z: number): PointerHit {
  return { cell: { x, z }, point: { x: x + 0.5, z: z + 0.5 } };
}

function run(actions: EditorAction[], model: MapModel = createEmptyMap(SIZE)) {
  return actions.reduce<EditorState>(editorReducer, createEditorState(model));
}

function pieces(state: EditorState) {
  return getChunk(state.history.present, { cx: 0, cz: 0 }).pieces;
}

function walls(state: EditorState) {
  return getChunk(state.history.present, { cx: 0, cz: 0 }).walls;
}

describe('editorReducer', () => {
  it('shouldPaintAWholeDragAndUndoItInOneStep', () => {
    const state = run([
      { type: 'choose-floor', key: 'grama' },
      { type: 'stroke-start', hit: hitAt(0, 0), newPropId: 'x' },
      { type: 'stroke-move', hit: hitAt(1, 0) },
      { type: 'stroke-move', hit: hitAt(2, 0) },
      { type: 'stroke-end' },
    ]);
    const painted = state.history.present;
    expect([0, 1, 2].map((x) => terrainAt(painted, { x, z: 0 })?.tile)).toEqual([
      'grama',
      'grama',
      'grama',
    ]);
    const undone = editorReducer(state, { type: 'undo' }).history.present;
    expect(terrainAt(undone, { x: 1, z: 0 })?.tile).toBe('piso-pedra');
    const redone = editorReducer(editorReducer(state, { type: 'undo' }), { type: 'redo' });
    expect(redone.history.present).toBe(painted);
  });

  it('shouldFillTheCellsSkippedByAFastDrag', () => {
    const state = run([
      { type: 'choose-floor', key: 'terra' },
      { type: 'stroke-start', hit: hitAt(0, 2), newPropId: 'x' },
      { type: 'stroke-move', hit: hitAt(4, 2) },
      { type: 'stroke-end' },
    ]);
    const tiles = [0, 1, 2, 3, 4].map((x) => terrainAt(state.history.present, { x, z: 2 })?.tile);
    expect(tiles).toEqual(['terra', 'terra', 'terra', 'terra', 'terra']);
    expect(terrainAt(state.history.present, { x: 2, z: 1 })?.tile).toBe('piso-pedra');
  });

  it('shouldRaiseEachCellOnlyOncePerDragCarryingThePieceOnIt', () => {
    const state = run([
      { type: 'choose-prop', asset: { source: 'catalog', key: 'barril' } },
      { type: 'stroke-start', hit: hitAt(1, 1), newPropId: 'barril-1' },
      { type: 'stroke-end' },
      { type: 'set-tool', tool: 'raise' },
      { type: 'stroke-start', hit: hitAt(1, 1), newPropId: 'x' },
      { type: 'stroke-move', hit: hitAt(1, 1) },
      { type: 'stroke-move', hit: hitAt(2, 1) },
      { type: 'stroke-move', hit: hitAt(1, 1) },
      { type: 'stroke-end' },
    ]);
    expect(terrainAt(state.history.present, { x: 1, z: 1 })?.height).toBe(1);
    expect(terrainAt(state.history.present, { x: 2, z: 1 })?.height).toBe(1);
    expect(pieces(state)[0]?.level).toBe(1);
  });

  it('shouldPlaceOnePropPerClickWithTheGhostRotationAndFootprint', () => {
    const state = run([
      { type: 'choose-prop', asset: { source: 'catalog', key: 'bau' } },
      { type: 'rotate' },
      { type: 'set-footprint', footprint: { width: 2, depth: 1 } },
      { type: 'stroke-start', hit: hitAt(2, 2), newPropId: 'bau-1' },
      { type: 'stroke-move', hit: hitAt(3, 2) },
      { type: 'stroke-end' },
    ]);
    expect(pieces(state)).toEqual([
      expect.objectContaining({
        id: 'bau-1',
        rotation: 1,
        x: 2,
        z: 2,
        level: 0,
        footprint: { width: 2, depth: 1 },
      }),
    ]);
  });

  it('shouldWarnOnceWhenAPieceDoesNotFit', () => {
    const state = run([
      { type: 'choose-prop', asset: { source: 'catalog', key: 'bau' } },
      { type: 'set-footprint', footprint: { width: 3, depth: 1 } },
      { type: 'stroke-start', hit: hitAt(4, 0), newPropId: 'bau-1' },
      { type: 'stroke-end' },
    ]);
    expect(pieces(state)).toEqual([]);
    expect(state.notice?.message).toMatch(/não cabe no mapa/);
    expect(canUndo(state.history)).toBe(false);
  });

  it('shouldRotateAndDeleteTheSelectedProp', () => {
    const placed = run([
      { type: 'choose-prop', asset: { source: 'catalog', key: 'mesa' } },
      { type: 'stroke-start', hit: hitAt(2, 2), newPropId: 'mesa-1' },
      { type: 'stroke-end' },
      { type: 'set-tool', tool: 'select' },
      { type: 'select-at', hit: hitAt(2, 2) },
    ]);
    expect(placed.selectedPiece).toEqual({ id: 'mesa-1', x: 2, z: 2 });
    const rotated = editorReducer(placed, { type: 'rotate' });
    expect(pieces(rotated)[0]?.rotation).toBe(1);
    expect(rotated.rotation).toBe(0);
    const deleted = editorReducer(rotated, { type: 'delete-selected' });
    expect(pieces(deleted)).toEqual([]);
    expect(deleted.selectedPiece).toBeNull();
  });

  it('shouldDrawWallsOnTheNearestEdgeWithTheChosenHeight', () => {
    const state = run([
      { type: 'choose-wall', key: 'parede-madeira' },
      { type: 'set-wall-height', height: 99 },
      {
        type: 'stroke-start',
        hit: { cell: { x: 1, z: 1 }, point: { x: 1.05, z: 1.5 } },
        newPropId: 'x',
      },
      { type: 'stroke-end' },
    ]);
    expect(state.wallHeight).toBe(MAX_WALL_HEIGHT_STEPS);
    expect(walls(state)).toEqual([
      {
        x: 1,
        z: 1,
        side: 'west',
        style: 'parede-madeira',
        height: MAX_WALL_HEIGHT_STEPS,
        level: 0,
      },
    ]);
  });

  it('shouldMergeContinuousAmbienceChangesIntoOneStep', () => {
    const state = run([
      { type: 'set-ambience', patch: { light: 0.7 }, coalesceKey: 'light' },
      { type: 'set-ambience', patch: { light: 0.8 }, coalesceKey: 'light' },
      { type: 'set-ambience', patch: { light: 0.9 }, coalesceKey: 'light' },
    ]);
    expect(state.history.past).toHaveLength(1);
    expect(state.history.present.header.ambience.light).toBe(0.9);
    const undone = editorReducer(state, { type: 'undo' });
    expect(undone.history.present.header.ambience.light).toBe(0.6);
  });

  it('shouldResizeTheMapAsOneUndoableStep', () => {
    const state = run([{ type: 'resize', size: { width: 40, depth: 3 } }]);
    expect(state.history.present.size).toEqual({ width: 40, depth: 3 });
    const undone = editorReducer(state, { type: 'undo' });
    expect(undone.history.present.size).toEqual(SIZE);
    const refused = editorReducer(state, { type: 'resize', size: { width: 0, depth: 3 } });
    expect(refused.history).toBe(state.history);
    expect(refused.notice?.message).toMatch(/de 1 a 1000 casas/);
  });

  it('shouldNotEditAnythingWithTheSelectTool', () => {
    const state = run([{ type: 'stroke-start', hit: hitAt(0, 0), newPropId: 'x' }]);
    expect(canUndo(state.history)).toBe(false);
    expect(state.stroke).toBeNull();
  });
});
