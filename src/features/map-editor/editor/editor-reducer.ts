/**
 * Estado do editor de diorama como redutor puro: ferramenta, peça escolhida,
 * histórico e traço do pincel. A cena só informa "o cursor apertou/passou nesta
 * casa"; quem decide o que muda no mapa é este arquivo (testável sem WebGL).
 */
import {
  MAX_WALL_HEIGHT,
  MIN_WALL_HEIGHT,
  type Ambience,
  type Cell,
  type GridSize,
  type MapDocument,
} from '@/domain';
import {
  DEFAULT_FLOOR_TILE,
  DEFAULT_PROP_KEY,
  DEFAULT_WALL_STYLE,
  nearestEdge,
  type PropAsset,
} from '@/features/scene';
import {
  adjustFloorHeight,
  eraseTarget,
  eraseTargetAt,
  normalizeRotation,
  placeProp,
  propsInCell,
  removeProp,
  rotateProp,
  ROTATION_STEP,
  setAmbience,
  setFloorTile,
  setWall,
} from './document-ops';
import {
  commitFrom,
  createHistory,
  pushHistory,
  redo,
  replacePresent,
  undo,
  type History,
} from './history';
import { cellsOnLine } from './stroke-line';

export type Tool = 'select' | 'floor' | 'wall' | 'prop' | 'erase' | 'raise' | 'lower';

export type Brush = { floor: string; wall: string; prop: PropAsset };

export type PointerHit = { cell: Cell; point: { x: number; z: number } };

type Stroke = {
  before: MapDocument;
  visited: ReadonlySet<string>;
  /** Última casa pintada: o próximo movimento preenche a linha até a casa nova. */
  last: PointerHit | null;
};

export type EditorState = {
  size: GridSize;
  history: History<MapDocument>;
  tool: Tool;
  brush: Brush;
  /** Giro (graus) do próximo objeto colocado. */
  rotation: number;
  wallHeight: number;
  selectedPropId: string | null;
  stroke: Stroke | null;
  /** Ajustes contínuos (ex: arrastar o controle de luz) viram um passo só no histórico. */
  coalesceKey: string | null;
};

export type EditorAction =
  | { type: 'load'; document: MapDocument; size: GridSize }
  | { type: 'set-tool'; tool: Tool }
  | { type: 'choose-floor'; key: string }
  | { type: 'choose-wall'; key: string }
  | { type: 'choose-prop'; asset: PropAsset }
  | { type: 'rotate' }
  | { type: 'set-wall-height'; height: number }
  | { type: 'stroke-start'; hit: PointerHit; newPropId: string }
  | { type: 'stroke-move'; hit: PointerHit }
  | { type: 'stroke-end' }
  | { type: 'select-at'; hit: PointerHit }
  | { type: 'delete-selected' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'set-ambience'; patch: Partial<Ambience>; coalesceKey?: string };

export const DEFAULT_BRUSH: Brush = {
  floor: DEFAULT_FLOOR_TILE,
  wall: DEFAULT_WALL_STYLE,
  prop: { source: 'catalog', key: DEFAULT_PROP_KEY },
};
const DEFAULT_WALL_HEIGHT = 2;
const RAISE_STEP = 1;

export function createEditorState(document: MapDocument, size: GridSize): EditorState {
  return {
    size,
    history: createHistory(document),
    tool: 'select',
    brush: DEFAULT_BRUSH,
    rotation: 0,
    wallHeight: DEFAULT_WALL_HEIGHT,
    selectedPropId: null,
    stroke: null,
    coalesceKey: null,
  };
}

/** Ferramentas que pintam arrastando (o objeto é um por clique). */
export function isPaintingTool(tool: Tool): boolean {
  return tool !== 'select' && tool !== 'prop';
}

/** Chave do que o traço já tocou: elevar duas vezes a mesma casa no mesmo arraste seria surpresa. */
function strokeKey(tool: Tool, hit: PointerHit): string {
  if (tool === 'wall') {
    const edge = nearestEdge(hit.cell, hit.point);
    return `${edge.side}:${edge.x}:${edge.z}`;
  }
  return `${hit.cell.x}:${hit.cell.z}`;
}

function applyTool(state: EditorState, hit: PointerHit, newPropId: string | null): MapDocument {
  const document = state.history.present;
  switch (state.tool) {
    case 'floor':
      return setFloorTile(document, state.size, { cell: hit.cell, tile: state.brush.floor });
    case 'wall':
      return setWall(document, state.size, {
        ...nearestEdge(hit.cell, hit.point),
        style: state.brush.wall,
        height: state.wallHeight,
      });
    case 'prop':
      if (!newPropId) return document;
      return placeProp(document, state.size, {
        id: newPropId,
        asset: state.brush.prop,
        cell: hit.cell,
        rotation: state.rotation,
      });
    case 'erase': {
      const target = eraseTargetAt(document, hit);
      return target ? eraseTarget(document, target) : document;
    }
    case 'raise':
      return adjustFloorHeight(document, hit.cell, RAISE_STEP);
    case 'lower':
      return adjustFloorHeight(document, hit.cell, -RAISE_STEP);
    case 'select':
      return document;
  }
}

function paint(state: EditorState, hit: PointerHit, newPropId: string | null): EditorState {
  if (!state.stroke) return state;
  const key = strokeKey(state.tool, hit);
  if (state.stroke.visited.has(key)) {
    const last = state.stroke.last;
    const sameCell = last?.cell.x === hit.cell.x && last.cell.z === hit.cell.z;
    return sameCell ? state : { ...state, stroke: { ...state.stroke, last: hit } };
  }
  const visited = new Set(state.stroke.visited).add(key);
  const next = applyTool(state, hit, newPropId);
  return {
    ...state,
    history: replacePresent(state.history, next),
    stroke: { ...state.stroke, visited, last: hit },
  };
}

/** Centro da casa: ponto usado para as casas preenchidas no meio do arraste. */
function cellCenter(cell: Cell): PointerHit {
  return { cell, point: { x: cell.x + 0.5, z: cell.z + 0.5 } };
}

/**
 * Pinta a casa nova e as do caminho desde a última. Paredes não interpolam: a
 * aresta depende de onde o cursor está dentro da casa, e o centro não diz isso.
 */
function paintAlong(state: EditorState, hit: PointerHit): EditorState {
  const last = state.stroke?.last;
  if (!last || state.tool === 'wall') return paint(state, hit, null);
  const between = cellsOnLine(last.cell, hit.cell).slice(1, -1).map(cellCenter);
  return [...between, hit].reduce<EditorState>(
    (current, step) => paint(current, step, null),
    state,
  );
}

function finishStroke(state: EditorState): EditorState {
  if (!state.stroke) return state;
  return { ...state, history: commitFrom(state.history, state.stroke.before), stroke: null };
}

/** Mudança de documento que vira um passo próprio no histórico. */
function commit(state: EditorState, next: MapDocument): EditorState {
  return { ...state, history: pushHistory(state.history, next), coalesceKey: null };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'load':
      return {
        ...createEditorState(action.document, action.size),
        tool: state.tool,
        brush: state.brush,
      };
    case 'set-tool':
      return { ...finishStroke(state), tool: action.tool };
    case 'choose-floor':
      return { ...state, brush: { ...state.brush, floor: action.key }, tool: 'floor' };
    case 'choose-wall':
      return { ...state, brush: { ...state.brush, wall: action.key }, tool: 'wall' };
    case 'choose-prop':
      return { ...state, brush: { ...state.brush, prop: action.asset }, tool: 'prop' };
    case 'rotate': {
      const selected = state.tool === 'select' ? state.selectedPropId : null;
      if (selected) return commit(state, rotateProp(state.history.present, selected));
      return { ...state, rotation: normalizeRotation(state.rotation + ROTATION_STEP) };
    }
    case 'set-wall-height':
      return {
        ...state,
        wallHeight: Math.min(Math.max(Math.round(action.height), MIN_WALL_HEIGHT), MAX_WALL_HEIGHT),
      };
    case 'stroke-start': {
      if (state.tool === 'select') return state;
      const started: EditorState = {
        ...finishStroke(state),
        stroke: { before: state.history.present, visited: new Set(), last: null },
        coalesceKey: null,
      };
      return paint(started, action.hit, action.newPropId);
    }
    case 'stroke-move':
      return isPaintingTool(state.tool) ? paintAlong(state, action.hit) : state;
    case 'stroke-end':
      return finishStroke(state);
    case 'select-at': {
      const top = propsInCell(state.history.present, action.hit.cell).at(-1);
      return { ...state, selectedPropId: top?.id ?? null };
    }
    case 'delete-selected': {
      if (!state.selectedPropId) return state;
      return {
        ...commit(state, removeProp(state.history.present, state.selectedPropId)),
        selectedPropId: null,
      };
    }
    case 'undo': {
      const settled = finishStroke(state);
      return { ...settled, history: undo(settled.history), coalesceKey: null };
    }
    case 'redo': {
      const settled = finishStroke(state);
      return { ...settled, history: redo(settled.history), coalesceKey: null };
    }
    case 'set-ambience': {
      const next = setAmbience(state.history.present, action.patch);
      const coalesce = action.coalesceKey !== undefined && action.coalesceKey === state.coalesceKey;
      return {
        ...state,
        history: coalesce ? replacePresent(state.history, next) : pushHistory(state.history, next),
        coalesceKey: action.coalesceKey ?? null,
      };
    }
  }
}
