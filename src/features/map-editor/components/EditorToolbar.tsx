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
import { MAX_WALL_HEIGHT, MIN_WALL_HEIGHT } from '@/domain';
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

function WallHeight({ state, dispatch }: Props) {
  const setHeight = (height: number) => dispatch({ type: 'set-wall-height', height });
  return (
    <div className={styles.stepper} role="group" aria-label="Altura da parede">
      <IconButton
        label="Parede mais baixa"
        icon={<Minus size={14} />}
        size="sm"
        disabled={state.wallHeight <= MIN_WALL_HEIGHT}
        onClick={() => setHeight(state.wallHeight - 1)}
      />
      <span className={styles.stepperValue} aria-live="polite">
        Altura {state.wallHeight}
      </span>
      <IconButton
        label="Parede mais alta"
        icon={<Plus size={14} />}
        size="sm"
        disabled={state.wallHeight >= MAX_WALL_HEIGHT}
        onClick={() => setHeight(state.wallHeight + 1)}
      />
    </div>
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
  const selectedRotates = state.tool === 'select' && state.selectedPropId !== null;
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
    </div>
  );
}
