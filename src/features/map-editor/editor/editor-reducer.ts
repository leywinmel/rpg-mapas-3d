/**
 * Estado do editor de diorama como redutor puro: ferramenta, peça escolhida,
 * histórico e traço do pincel. A cena só informa "o cursor apertou/passou nesta
 * casa"; quem decide o que muda no mapa é este arquivo (testável sem WebGL).
 *
 * O mapa é o MapModel do v2: cada operação troca só os pedaços tocados, então o
 * histórico guarda referências baratas e o autosave grava só o que mudou.
 */
import type { Ambience, Cell, GridSize, MapResult } from '@/domain';
import {
  MAX_FOOTPRINT,
  MAX_WALL_HEIGHT_STEPS,
  MIN_WALL_HEIGHT_STEPS,
  paintTerrainCell,
  paintTerrainRect,
  resizeMap,
  stepTerrainHeight,
  STORY_HEIGHT_STEPS,
  type Footprint,
  type MapModel,
  type PieceRef,
} from '@/domain/map-v2';
import {
  DEFAULT_FLOOR_TILE,
  DEFAULT_PROP_KEY,
  DEFAULT_WALL_STYLE,
  nearestEdge,
  type PropAsset,
} from '@/features/scene';
import {
  commitFrom,
  createHistory,
  pushHistory,
  redo,
  replacePresent,
  undo,
  type History,
} from './history';
import {
  eraseTarget,
  eraseTargetAt,
  normalizeQuarterTurns,
  placePieceAt,
  placeWallAt,
  rotatePiece,
  shiftPieceLevel,
  setAmbience,
  topPieceAt,
  type PointerHit,
} from './model-ops';
import { cellsOnLine } from './stroke-line';

export type { PointerHit } from './model-ops';

export type Tool = 'select' | 'floor' | 'wall' | 'prop' | 'erase' | 'raise' | 'lower';

export type Brush = { floor: string; wall: string; prop: PropAsset };

/**
 * Forma do pincel de chão e de altura: "free" pinta as casas por onde o cursor passa;
 * "rect" pinta o retângulo entre a casa onde o arraste começou e a casa sob o cursor
 * (para cobrir um mapa gigante sem passar o mouse casa por casa).
 */
export type BrushShape = 'free' | 'rect';

const RECT_TOOLS: ReadonlySet<Tool> = new Set<Tool>(['floor', 'raise', 'lower']);

/** A ferramenta aceita o pincel em retângulo? */
export function supportsRectShape(tool: Tool): boolean {
  return RECT_TOOLS.has(tool);
}

type Stroke = {
  before: MapModel;
  visited: ReadonlySet<string>;
  /** Casa onde o arraste em retângulo começou (nulo no pincel livre). */
  anchor: Cell | null;
  /** Última casa pintada: o próximo movimento preenche a linha até a casa nova. */
  last: PointerHit | null;
};

/** Aviso de uma jogada recusada (ex: a peça não cabe no mapa), para a tela mostrar uma vez. */
export type EditorNotice = { readonly message: string };

export type EditorState = {
  history: History<MapModel>;
  tool: Tool;
  brush: Brush;
  shape: BrushShape;
  /** Giro do próximo objeto colocado, em quartos de volta (0 a 3). */
  rotation: number;
  /** Tamanho em casas do próximo objeto colocado, antes de girar. */
  footprint: Footprint;
  /** Altura da próxima parede, em degraus. */
  wallHeight: number;
  selectedPiece: PieceRef | null;
  stroke: Stroke | null;
  /** Ajustes contínuos (ex: arrastar o controle de luz) viram um passo só no histórico. */
  coalesceKey: string | null;
  notice: EditorNotice | null;
};

export type EditorAction =
  | { type: 'set-tool'; tool: Tool }
  | { type: 'choose-floor'; key: string }
  | { type: 'choose-wall'; key: string }
  | { type: 'choose-prop'; asset: PropAsset }
  | { type: 'rotate' }
  | { type: 'set-wall-height'; height: number }
  | { type: 'set-shape'; shape: BrushShape }
  | { type: 'set-footprint'; footprint: Footprint }
  | { type: 'stroke-start'; hit: PointerHit; newPropId: string }
  | { type: 'stroke-move'; hit: PointerHit }
  | { type: 'stroke-end' }
  | { type: 'select-at'; hit: PointerHit }
  | { type: 'delete-selected' }
  /** Sobe (positivo) ou desce o objeto selecionado, em degraus. */
  | { type: 'shift-level'; delta: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'set-ambience'; patch: Partial<Ambience>; coalesceKey?: string }
  | { type: 'resize'; size: GridSize };

export const DEFAULT_BRUSH: Brush = {
  floor: DEFAULT_FLOOR_TILE,
  wall: DEFAULT_WALL_STYLE,
  prop: { source: 'catalog', key: DEFAULT_PROP_KEY },
};
/** Uma parede nova tem um andar de altura: a mesma parede de 2 unidades do v1. */
export const DEFAULT_WALL_HEIGHT = STORY_HEIGHT_STEPS;
const SINGLE_CELL: Footprint = { width: 1, depth: 1 };
const RAISE_STEP = 1;

export function createEditorState(model: MapModel): EditorState {
  return {
    history: createHistory(model),
    tool: 'select',
    brush: DEFAULT_BRUSH,
    shape: 'free',
    rotation: 0,
    footprint: SINGLE_CELL,
    wallHeight: DEFAULT_WALL_HEIGHT,
    selectedPiece: null,
    stroke: null,
    coalesceKey: null,
    notice: null,
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

function clampSide(value: number, max: number): number {
  return Math.min(Math.max(Math.round(value), 1), max);
}

function applyTool(
  state: EditorState,
  hit: PointerHit,
  newPropId: string | null,
): MapResult<MapModel> {
  const model = state.history.present;
  const unchanged: MapResult<MapModel> = { ok: true, value: model };
  switch (state.tool) {
    case 'floor':
      return paintTerrainCell(model, { cell: hit.cell, tile: state.brush.floor });
    case 'wall':
      return placeWallAt(model, {
        edge: nearestEdge(hit.cell, hit.point),
        style: state.brush.wall,
        height: state.wallHeight,
      });
    case 'prop':
      if (!newPropId) return unchanged;
      return placePieceAt(model, {
        id: newPropId,
        asset: state.brush.prop,
        anchor: hit.cell,
        rotation: state.rotation,
        footprint: state.footprint,
      });
    case 'erase': {
      const target = eraseTargetAt(model, hit);
      return target ? eraseTarget(model, target) : unchanged;
    }
    case 'raise':
      return stepTerrainHeight(model, { from: hit.cell, to: hit.cell, delta: RAISE_STEP });
    case 'lower':
      return stepTerrainHeight(model, { from: hit.cell, to: hit.cell, delta: -RAISE_STEP });
    case 'select':
      return unchanged;
  }
}

/** O aviso da recusa; o mesmo objeto quando a mensagem se repete (não avisa de novo no arraste). */
function noticeFor(state: EditorState, errors: readonly string[]): EditorNotice {
  const message = errors[0] ?? 'Essa mudança não coube no mapa.';
  return state.notice?.message === message ? state.notice : { message };
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
  const stroke = { ...state.stroke, visited, last: hit };
  const result = applyTool(state, hit, newPropId);
  if (!result.ok) return { ...state, stroke, notice: noticeFor(state, result.errors) };
  return { ...state, history: replacePresent(state.history, result.value), stroke };
}

/** Centro da casa: ponto usado para as casas preenchidas no meio do arraste. */
function cellCenter(cell: PointerHit['cell']): PointerHit {
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

function rectChange(state: EditorState, from: Cell, to: Cell): MapResult<MapModel> {
  const before = state.stroke?.before ?? state.history.present;
  if (state.tool === 'floor')
    return paintTerrainRect(before, { from, to, tile: state.brush.floor });
  const delta = state.tool === 'raise' ? RAISE_STEP : -RAISE_STEP;
  return stepTerrainHeight(before, { from, to, delta });
}

/**
 * O retângulo é refeito a partir do mapa de ANTES do arraste a cada casa nova: encolher o
 * retângulo desfaz o que saiu dele, e elevar não acumula um degrau por movimento.
 */
function paintRect(state: EditorState, hit: PointerHit): EditorState {
  const stroke = state.stroke;
  if (!stroke?.anchor) return state;
  const last = stroke.last;
  if (last && last.cell.x === hit.cell.x && last.cell.z === hit.cell.z) return state;
  const next = { ...stroke, last: hit };
  const result = rectChange(state, stroke.anchor, hit.cell);
  if (!result.ok) return { ...state, stroke: next, notice: noticeFor(state, result.errors) };
  return { ...state, history: replacePresent(state.history, result.value), stroke: next };
}

function usesRect(state: EditorState): boolean {
  return state.shape === 'rect' && supportsRectShape(state.tool);
}

function finishStroke(state: EditorState): EditorState {
  if (!state.stroke) return state;
  return { ...state, history: commitFrom(state.history, state.stroke.before), stroke: null };
}

/** Mudança de mapa que vira um passo próprio no histórico; recusada, vira aviso. */
function commit(state: EditorState, result: MapResult<MapModel>): EditorState {
  if (!result.ok) return { ...state, notice: noticeFor(state, result.errors) };
  return { ...state, history: pushHistory(state.history, result.value), coalesceKey: null };
}

function rotate(state: EditorState): EditorState {
  const selected = state.tool === 'select' ? state.selectedPiece : null;
  if (selected) return commit(state, rotatePiece(state.history.present, selected));
  return { ...state, rotation: normalizeQuarterTurns(state.rotation + 1) };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'set-tool':
      return { ...finishStroke(state), tool: action.tool };
    case 'choose-floor':
      return { ...state, brush: { ...state.brush, floor: action.key }, tool: 'floor' };
    case 'choose-wall':
      return { ...state, brush: { ...state.brush, wall: action.key }, tool: 'wall' };
    case 'choose-prop':
      return { ...state, brush: { ...state.brush, prop: action.asset }, tool: 'prop' };
    case 'rotate':
      return rotate(state);
    case 'set-wall-height':
      return {
        ...state,
        wallHeight: Math.min(
          Math.max(Math.round(action.height), MIN_WALL_HEIGHT_STEPS),
          MAX_WALL_HEIGHT_STEPS,
        ),
      };
    case 'set-shape':
      return { ...finishStroke(state), shape: action.shape };
    case 'set-footprint':
      return {
        ...state,
        footprint: {
          width: clampSide(action.footprint.width, MAX_FOOTPRINT),
          depth: clampSide(action.footprint.depth, MAX_FOOTPRINT),
        },
      };
    case 'stroke-start': {
      if (state.tool === 'select') return state;
      const started: EditorState = {
        ...finishStroke(state),
        stroke: {
          before: state.history.present,
          visited: new Set(),
          anchor: usesRect(state) ? action.hit.cell : null,
          last: null,
        },
        coalesceKey: null,
      };
      if (usesRect(started)) return paintRect(started, action.hit);
      return paint(started, action.hit, action.newPropId);
    }
    case 'stroke-move':
      if (state.stroke?.anchor) return paintRect(state, action.hit);
      return isPaintingTool(state.tool) ? paintAlong(state, action.hit) : state;
    case 'stroke-end':
      return finishStroke(state);
    case 'select-at': {
      const top = topPieceAt(state.history.present, action.hit.cell);
      return { ...state, selectedPiece: top ? { id: top.id, x: top.x, z: top.z } : null };
    }
    case 'delete-selected': {
      if (!state.selectedPiece) return state;
      const removed = eraseTarget(state.history.present, {
        layer: 'piece',
        piece: state.selectedPiece,
      });
      return { ...commit(state, removed), selectedPiece: null };
    }
    case 'shift-level': {
      if (state.tool !== 'select' || !state.selectedPiece) return state;
      const shifted = shiftPieceLevel(state.history.present, state.selectedPiece, action.delta);
      if (shifted.ok && shifted.value === state.history.present) return state;
      return commit(state, shifted);
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
    case 'resize':
      return commit(finishStroke(state), resizeMap(state.history.present, action.size));
  }
}
