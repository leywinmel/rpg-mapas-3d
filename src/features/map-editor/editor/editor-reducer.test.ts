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
  isPaintingTool,
  prefabPieceId,
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
  it('shouldPaintADraggedRectangleThatFollowsTheCursorAndUndoesInOneStep', () => {
    const grown = run([
      { type: 'choose-floor', key: 'grama' },
      { type: 'set-shape', shape: 'rect' },
      { type: 'stroke-start', hit: hitAt(0, 0), newPropId: 'x' },
      { type: 'stroke-move', hit: hitAt(3, 2) },
    ]);
    expect(terrainAt(grown.history.present, { x: 3, z: 2 })?.tile).toBe('grama');
    const shrunk = editorReducer(grown, { type: 'stroke-move', hit: hitAt(1, 1) });
    // O que saiu do retângulo volta a ser como era antes do arraste.
    expect(terrainAt(shrunk.history.present, { x: 3, z: 2 })?.tile).toBe('piso-pedra');
    expect(terrainAt(shrunk.history.present, { x: 1, z: 1 })?.tile).toBe('grama');
    const done = editorReducer(shrunk, { type: 'stroke-end' });
    expect(
      terrainAt(editorReducer(done, { type: 'undo' }).history.present, { x: 0, z: 0 })?.tile,
    ).toBe('piso-pedra');
  });

  it('shouldRaiseARectangleOnlyOneStepHoweverTheCursorMoves', () => {
    const state = run([
      { type: 'set-tool', tool: 'raise' },
      { type: 'set-shape', shape: 'rect' },
      { type: 'stroke-start', hit: hitAt(0, 0), newPropId: 'x' },
      { type: 'stroke-move', hit: hitAt(2, 2) },
      { type: 'stroke-move', hit: hitAt(1, 2) },
      { type: 'stroke-move', hit: hitAt(2, 2) },
      { type: 'stroke-end' },
    ]);
    expect(terrainAt(state.history.present, { x: 2, z: 2 })?.height).toBe(1);
    expect(terrainAt(state.history.present, { x: 3, z: 3 })?.height).toBe(0);
  });

  it('shouldRaiseTheSelectedPieceAndUndoIt', () => {
    const placed = run([
      { type: 'set-tool', tool: 'prop' },
      { type: 'stroke-start', hit: hitAt(1, 1), newPropId: 'p' },
      { type: 'stroke-end' },
      { type: 'set-tool', tool: 'select' },
      { type: 'select-at', hit: hitAt(1, 1) },
    ]);
    const raised = editorReducer(placed, { type: 'shift-level', delta: 2 });
    expect(pieces(raised)[0]?.level).toBe(2);
    expect(editorReducer(placed, { type: 'shift-level', delta: -1 })).toBe(placed);
    expect(pieces(editorReducer(raised, { type: 'undo' }))[0]?.level).toBe(0);
  });

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

  it('shouldMoveTheSelectedLooseObjectByDragAndArrowsAndUndoEachStep', () => {
    const placed = run([
      { type: 'choose-prop', asset: { source: 'catalog', key: 'barril' } },
      { type: 'stroke-start', hit: hitAt(1, 1), newPropId: 'barril-1' },
      { type: 'stroke-end' },
      { type: 'set-tool', tool: 'select' },
      { type: 'select-at', hit: hitAt(1, 1) },
    ]);
    const dropped = editorReducer(placed, { type: 'move-selected', anchor: { x: 3, z: 2 } });
    expect(pieces(dropped).map(({ x, z }) => ({ x, z }))).toEqual([{ x: 3, z: 2 }]);
    expect(dropped.selectedPiece).toEqual({ id: 'barril-1', x: 3, z: 2 });
    const nudged = editorReducer(dropped, { type: 'nudge-selected', dx: 1, dz: 0 });
    expect(pieces(nudged)[0]).toMatchObject({ x: 4, z: 2 });
    const undone = editorReducer(nudged, { type: 'undo' });
    expect(pieces(undone)[0]).toMatchObject({ x: 3, z: 2 });
    expect(pieces(editorReducer(undone, { type: 'undo' }))[0]).toMatchObject({ x: 1, z: 1 });
  });

  it('shouldWarnWhenTheMovedObjectWouldLeaveTheMap', () => {
    const placed = run([
      { type: 'choose-prop', asset: { source: 'catalog', key: 'barril' } },
      { type: 'stroke-start', hit: hitAt(0, 0), newPropId: 'barril-1' },
      { type: 'stroke-end' },
      { type: 'set-tool', tool: 'select' },
      { type: 'select-at', hit: hitAt(0, 0) },
    ]);
    const refused = editorReducer(placed, { type: 'nudge-selected', dx: -1, dz: 0 });
    expect(pieces(refused)[0]).toMatchObject({ x: 0, z: 0 });
    expect(refused.notice?.message).toMatch(/sairia do mapa/);
    expect(refused.selectedPiece).toEqual(placed.selectedPiece);
  });

  it('shouldNotMoveFixedScenery', () => {
    const placed = run([
      { type: 'choose-prop', asset: { source: 'catalog', key: 'pilar' } },
      { type: 'stroke-start', hit: hitAt(1, 1), newPropId: 'pilar-1' },
      { type: 'stroke-end' },
      { type: 'set-tool', tool: 'select' },
      { type: 'select-at', hit: hitAt(1, 1) },
    ]);
    expect(editorReducer(placed, { type: 'nudge-selected', dx: 1, dz: 0 })).toBe(placed);
    expect(editorReducer(placed, { type: 'move-selected', anchor: { x: 3, z: 3 } })).toBe(placed);
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

describe('casas prontas no editor', () => {
  const CLICK_ID = '123e4567-e89b-12d3-a456-426614174000';
  const big = () => createEmptyMap({ width: 30, depth: 30 });
  const all = (state: EditorState) =>
    [...state.history.present.chunks.values()].flatMap((chunk) => [...chunk.pieces]);

  it('shouldPlaceTheWholeHouseWithOneClickAndUndoItInOneStep', () => {
    const placed = run(
      [
        { type: 'choose-prefab', id: 'medieval-sobrado' },
        { type: 'stroke-start', hit: hitAt(15, 15), newPropId: CLICK_ID },
        { type: 'stroke-move', hit: hitAt(18, 18) },
        { type: 'stroke-end' },
      ],
      big(),
    );
    expect(placed.tool).toBe('prefab');
    const ids = all(placed).map((piece) => piece.id);
    expect(ids.length).toBeGreaterThan(10);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      ids.every((id) => id.length <= 40 && id.startsWith(prefabPieceId(CLICK_ID, 0).slice(0, 32))),
    ).toBe(true);
    const undone = editorReducer(placed, { type: 'undo' });
    expect(all(undone)).toEqual([]);
    expect(canUndo(undone.history)).toBe(false);
  });

  it('shouldWarnWhenTheHouseDoesNotFit', () => {
    const state = run(
      [
        { type: 'choose-prefab', id: 'medieval-taverna' },
        { type: 'stroke-start', hit: hitAt(0, 0), newPropId: CLICK_ID },
        { type: 'stroke-end' },
      ],
      big(),
    );
    expect(state.notice?.message).toMatch(/não cabe/);
    expect(all(state)).toEqual([]);
  });

  it('shouldNotPaintHousesWhileDragging', () => {
    expect(isPaintingTool('prefab')).toBe(false);
  });
});
