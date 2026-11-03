import { useState, type Dispatch, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  BrickWall,
  Eraser,
  Keyboard,
  Minus,
  MousePointer2,
  PaintBucket,
  Plus,
  Redo2,
  RotateCw,
  Undo2,
} from 'lucide-react';
import { IconButton, Toolbar, ToolbarSeparator } from '@/components';
import {
  MAX_FOOTPRINT,
  MAX_WALL_HEIGHT_STEPS,
  MIN_WALL_HEIGHT_STEPS,
  stepsToWorld,
} from '@/domain/map-v2';
import type { EditorAction, EditorState, Tool } from '../editor/editor-reducer';
import { canRedo, canUndo } from '../editor/history';
import { SHORTCUT_HELP, TOOL_KEYS, TOOL_LABELS } from '../editor/shortcuts';
import styles from './EditorToolbar.module.css';

const ICON_SIZE = 18;

const TOOL_ICONS: Readonly<Record<Tool, ReactNode>> = {
  select: <MousePointer2 size={ICON_SIZE} />,
  floor: <PaintBucket size={ICON_SIZE} />,
  wall: <BrickWall size={ICON_SIZE} />,
  prop: <Box size={ICON_SIZE} />,
  erase: <Eraser size={ICON_SIZE} />,
  raise: <ArrowUpFromLine size={ICON_SIZE} />,
  lower: <ArrowDownToLine size={ICON_SIZE} />,
};

const TOOLS = Object.keys(TOOL_ICONS) as Tool[];

function toolLabel(tool: Tool): string {
  return `${TOOL_LABELS[tool]} (${TOOL_KEYS[tool]})`;
}

type Props = { state: EditorState; dispatch: Dispatch<EditorAction> };

const STEPPER_ICON_SIZE = 14;
const MIN_FOOTPRINT_SIDE = 1;
const worldUnits = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Texto do valor na tela (ex: "Altura 2"). */
  display: string;
  lowerLabel: string;
  raiseLabel: string;
  onChange: (value: number) => void;
};

function Stepper({
  label,
  value,
  min,
  max,
  display,
  lowerLabel,
  raiseLabel,
  onChange,
}: StepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <IconButton
        label={lowerLabel}
        icon={<Minus size={STEPPER_ICON_SIZE} />}
        size="sm"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      />
      <span className={styles.stepperValue} aria-live="polite">
        {display}
      </span>
      <IconButton
        label={raiseLabel}
        icon={<Plus size={STEPPER_ICON_SIZE} />}
        size="sm"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      />
    </div>
  );
}

/** Altura em degraus de meia unidade; a tela mostra em unidades, como o mestre já via no v1. */
function WallHeight({ state, dispatch }: Props) {
  return (
    <Stepper
      label="Altura da parede"
      value={state.wallHeight}
      min={MIN_WALL_HEIGHT_STEPS}
      max={MAX_WALL_HEIGHT_STEPS}
      display={`Altura ${worldUnits.format(stepsToWorld(state.wallHeight))}`}
      lowerLabel="Parede mais baixa"
      raiseLabel="Parede mais alta"
      onChange={(height) => dispatch({ type: 'set-wall-height', height })}
    />
  );
}

/** Quantas casas o próximo objeto ocupa (antes de girar). */
function PieceFootprint({ state, dispatch }: Props) {
  const { footprint } = state;
  return (
    <>
      <Stepper
        label="Largura do objeto"
        value={footprint.width}
        min={MIN_FOOTPRINT_SIDE}
        max={MAX_FOOTPRINT}
        display={`Largura ${footprint.width}`}
        lowerLabel="Objeto mais estreito"
        raiseLabel="Objeto mais largo"
        onChange={(width) =>
          dispatch({ type: 'set-footprint', footprint: { ...footprint, width } })
        }
      />
      <Stepper
        label="Profundidade do objeto"
        value={footprint.depth}
        min={MIN_FOOTPRINT_SIDE}
        max={MAX_FOOTPRINT}
        display={`Fundo ${footprint.depth}`}
        lowerLabel="Objeto mais raso"
        raiseLabel="Objeto mais fundo"
        onChange={(depth) =>
          dispatch({ type: 'set-footprint', footprint: { ...footprint, depth } })
        }
      />
    </>
  );
}

function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.helpAnchor}>
      <IconButton
        label="Atalhos de teclado"
        icon={<Keyboard size={ICON_SIZE} />}
        active={open}
        aria-expanded={open}
        aria-controls="editor-shortcuts"
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div id="editor-shortcuts" className={styles.help} role="region" aria-label="Atalhos">
          <h3 className={styles.helpTitle}>Atalhos do editor</h3>
          <dl className={styles.helpList}>
            {SHORTCUT_HELP.map((item) => (
              <div key={item.keys} className={styles.helpRow}>
                <dt>
                  <kbd>{item.keys}</kbd>
                </dt>
                <dd>{item.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

/** Ferramentas do mestre: pincéis, girar, desfazer/refazer e a ajuda de atalhos. */
export function EditorToolbar({ state, dispatch }: Props) {
  const selectedRotates = state.tool === 'select' && state.selectedPiece !== null;
  return (
    <div className={styles.wrapper}>
      <Toolbar label="Ferramentas do editor">
        {TOOLS.map((tool) => (
          <IconButton
            key={tool}
            label={toolLabel(tool)}
            icon={TOOL_ICONS[tool]}
            active={state.tool === tool}
            onClick={() => dispatch({ type: 'set-tool', tool })}
          />
        ))}
        <ToolbarSeparator />
        <IconButton
          label={selectedRotates ? 'Girar o objeto selecionado (R)' : 'Girar a peça (R)'}
          icon={<RotateCw size={ICON_SIZE} />}
          onClick={() => dispatch({ type: 'rotate' })}
        />
        <IconButton
          label="Desfazer (Ctrl+Z)"
          icon={<Undo2 size={ICON_SIZE} />}
          disabled={!canUndo(state.history)}
          onClick={() => dispatch({ type: 'undo' })}
        />
        <IconButton
          label="Refazer (Ctrl+Shift+Z)"
          icon={<Redo2 size={ICON_SIZE} />}
          disabled={!canRedo(state.history)}
          onClick={() => dispatch({ type: 'redo' })}
        />
        <ToolbarSeparator />
        <ShortcutsHelp />
      </Toolbar>
      {state.tool === 'wall' && (
        <Toolbar label="Opções da parede">
          <WallHeight state={state} dispatch={dispatch} />
        </Toolbar>
      )}
      {state.tool === 'prop' && (
        <Toolbar label="Tamanho do objeto">
          <PieceFootprint state={state} dispatch={dispatch} />
        </Toolbar>
      )}
    </div>
  );
}
