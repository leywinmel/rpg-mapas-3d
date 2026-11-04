import { useState, type Dispatch } from 'react';
import { SegmentedControl, type SegmentOption } from '@/components';
import {
  findPrefab,
  PREFABS,
  prefabBlueprint,
  SETTLEMENT_STYLE_LABELS,
  SETTLEMENT_STYLES,
  type Blueprint,
  type PrefabDefinition,
  type SettlementStyle,
} from '@/domain/map-gen';
import type { Brush, EditorAction, Tool } from '../editor/editor-reducer';
import { TOOL_KEYS } from '../editor/shortcuts';
import type { StyleFilter } from '@/features/scene';
import styles from './SidePanel.module.css';
import plan from './PrefabPanel.module.css';

const STYLE_OPTIONS: ReadonlyArray<SegmentOption<SettlementStyle>> = SETTLEMENT_STYLES.map(
  (style) => ({ value: style, label: SETTLEMENT_STYLE_LABELS[style] }),
);
const DEFAULT_SETTLEMENT_STYLE: SettlementStyle = 'medieval';
/** Folga em volta da planta, em casas, para o traço da parede não ser cortado na borda. */
const PLAN_MARGIN = 0.5;

/** Planta do térreo: paredes em traço e a porta destacada (sempre na face de cima da planta). */
function PrefabPlan({ blueprint }: { blueprint: Blueprint }) {
  const { width, depth, door } = blueprint;
  const ground = blueprint.walls.filter((wall) => wall.level === 0);
  const viewBox = `${-PLAN_MARGIN} ${-PLAN_MARGIN} ${width + 2 * PLAN_MARGIN} ${depth + 2 * PLAN_MARGIN}`;
  return (
    <svg className={plan.plan} viewBox={viewBox} aria-hidden="true">
      <rect className={plan.floor} width={width} height={depth} />
      {ground.map((wall) => {
        const north = wall.side === 'north';
        return (
          <line
            key={`${wall.side}:${wall.x}:${wall.z}`}
            className={plan.wall}
            x1={wall.x}
            y1={wall.z}
            x2={north ? wall.x + 1 : wall.x}
            y2={north ? wall.z : wall.z + 1}
          />
        );
      })}
      <line className={plan.door} x1={door.x} y1={door.z} x2={door.x + 1} y2={door.z} />
    </svg>
  );
}

function storiesLabel(stories: number): string {
  return stories === 1 ? '1 andar' : `${stories} andares`;
}

function prefabTitle(prefab: PrefabDefinition): string {
  return `${prefab.label}: ${prefab.width}×${prefab.depth} casas, ${storiesLabel(prefab.stories)}`;
}

/** O filtro da biblioteca manda; sem ele ("Todos"), vale o estilo da última casa escolhida. */
function initialStyle(libraryStyle: StyleFilter, brush: Brush): SettlementStyle {
  if (libraryStyle !== 'all') return libraryStyle;
  return findPrefab(brush.prefab)?.style ?? DEFAULT_SETTLEMENT_STYLE;
}

type Props = {
  brush: Brush;
  tool: Tool;
  dispatch: Dispatch<EditorAction>;
  /** Estilo escolhido na biblioteca; as casas abrem nele. */
  libraryStyle: StyleFilter;
};

/**
 * Casas prontas: escolher uma liga a ferramenta; cada clique no mapa põe a casa inteira
 * centrada no cursor (R gira), e um Ctrl+Z tira tudo de uma vez.
 */
export function PrefabPanel({ brush, tool, dispatch, libraryStyle }: Props) {
  const [style, setStyle] = useState<SettlementStyle>(() => initialStyle(libraryStyle, brush));
  const prefabs = PREFABS.filter((prefab) => prefab.style === style);
  return (
    <div className={styles.stack}>
      <SegmentedControl
        label="Estilo das casas"
        options={STYLE_OPTIONS}
        value={style}
        onChange={setStyle}
      />
      <p className={styles.muted}>
        Clique no mapa para pôr a casa inteira, com móveis e telhado. R gira; Ctrl+Z desfaz a casa
        toda. Atalho da ferramenta: {TOOL_KEYS.prefab}.
      </p>
      <ul className={styles.grid}>
        {prefabs.map((prefab) => (
          <li key={prefab.id}>
            <button
              type="button"
              className={styles.piece}
              aria-pressed={tool === 'prefab' && brush.prefab === prefab.id}
              title={prefabTitle(prefab)}
              onClick={() => dispatch({ type: 'choose-prefab', id: prefab.id })}
            >
              <PrefabPlan blueprint={prefabBlueprint(prefab)} />
              <span className={styles.pieceLabel}>{prefab.label}</span>
              <span className={plan.meta}>{storiesLabel(prefab.stories)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
