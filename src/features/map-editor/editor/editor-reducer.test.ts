import { describe, expect, it } from 'vitest';
import { createEmptyDocument, MAX_WALL_HEIGHT, type MapDocument } from '@/domain';
import { canUndo } from './history';
import { floorAt } from './document-ops';
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

function run(actions: EditorAction[], document: MapDocument = createEmptyDocument(SIZE)) {
  return actions.reduce<EditorState>(editorReducer, createEditorState(document, SIZE));
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
    expect([0, 1, 2].map((x) => floorAt(painted, { x, z: 0 })?.tile)).toEqual([
      'grama',
      'grama',
      'grama',
    ]);
    const undone = editorReducer(state, { type: 'undo' }).history.present;
    expect(floorAt(undone, { x: 1, z: 0 })?.tile).toBe('piso-pedra');
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
    const tiles = [0, 1, 2, 3, 4].map((x) => floorAt(state.history.present, { x, z: 2 })?.tile);
    expect(tiles).toEqual(['terra', 'terra', 'terra', 'terra', 'terra']);
    expect(floorAt(state.history.present, { x: 2, z: 1 })?.tile).toBe('piso-pedra');
  });

  it('shouldRaiseEachCellOnlyOncePerDrag', () => {
    const state = run([
      { type: 'set-tool', tool: 'raise' },
      { type: 'stroke-start', hit: hitAt(1, 1), newPropId: 'x' },
      { type: 'stroke-move', hit: hitAt(1, 1) },
      { type: 'stroke-move', hit: hitAt(2, 1) },
      { type: 'stroke-move', hit: hitAt(1, 1) },
      { type: 'stroke-end' },
    ]);
    expect(floorAt(state.history.present, { x: 1, z: 1 })?.height).toBe(1);
    expect(floorAt(state.history.present, { x: 2, z: 1 })?.height).toBe(1);
  });

  it('shouldPlaceOnePropPerClickWithTheGhostRotation', () => {
    const state = run([
      { type: 'choose-prop', asset: { source: 'catalog', key: 'bau' } },
      { type: 'rotate' },
      { type: 'stroke-start', hit: hitAt(3, 3), newPropId: 'bau-1' },
      { type: 'stroke-move', hit: hitAt(4, 3) },
      { type: 'stroke-end' },
    ]);
    expect(state.history.present.props).toEqual([
      expect.objectContaining({ id: 'bau-1', rotation: 90, x: 3.5, z: 3.5 }),
    ]);
  });

  it('shouldRotateAndDeleteTheSelectedProp', () => {
    const placed = run([
      { type: 'choose-prop', asset: { source: 'catalog', key: 'mesa' } },
      { type: 'stroke-start', hit: hitAt(2, 2), newPropId: 'mesa-1' },
      { type: 'stroke-end' },
      { type: 'set-tool', tool: 'select' },
      { type: 'select-at', hit: hitAt(2, 2) },
    ]);
    expect(placed.selectedPropId).toBe('mesa-1');
    const rotated = editorReducer(placed, { type: 'rotate' });
    expect(rotated.history.present.props[0]?.rotation).toBe(90);
    expect(rotated.rotation).toBe(0);
    const deleted = editorReducer(rotated, { type: 'delete-selected' });
    expect(deleted.history.present.props).toEqual([]);
    expect(deleted.selectedPropId).toBeNull();
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
    expect(state.wallHeight).toBe(MAX_WALL_HEIGHT);
    expect(state.history.present.walls).toEqual([
      { x: 1, z: 1, side: 'west', style: 'parede-madeira', height: MAX_WALL_HEIGHT },
    ]);
  });

  it('shouldMergeContinuousAmbienceChangesIntoOneStep', () => {
    const state = run([
      { type: 'set-ambience', patch: { light: 0.7 }, coalesceKey: 'light' },
      { type: 'set-ambience', patch: { light: 0.8 }, coalesceKey: 'light' },
      { type: 'set-ambience', patch: { light: 0.9 }, coalesceKey: 'light' },
    ]);
    expect(state.history.past).toHaveLength(1);
    expect(state.history.present.ambience.light).toBe(0.9);
    const undone = editorReducer(state, { type: 'undo' });
    expect(undone.history.present.ambience.light).toBe(0.6);
  });

  it('shouldNotEditAnythingWithTheSelectTool', () => {
    const state = run([{ type: 'stroke-start', hit: hitAt(0, 0), newPropId: 'x' }]);
    expect(canUndo(state.history)).toBe(false);
    expect(state.stroke).toBeNull();
  });
});
