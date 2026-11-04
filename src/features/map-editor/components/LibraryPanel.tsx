import { useState, type Dispatch } from 'react';
import { Search } from 'lucide-react';
import { EmptyState, SegmentedControl, TextField, type SegmentOption } from '@/components';
import {
  pieceCatalog,
  type CatalogEntry,
  type PieceCategory,
  type StyleFilter,
} from '@/features/scene';
import type { Brush, EditorAction, Tool } from '../editor/editor-reducer';
import { MyModelsSection } from './MyModelsSection';
import { PieceThumbnail } from './PieceThumbnail';
import styles from './SidePanel.module.css';

const STYLE_OPTIONS: ReadonlyArray<SegmentOption<StyleFilter>> = [
  { value: 'all', label: 'Todos' },
  { value: 'medieval', label: 'Medieval' },
  { value: 'modern', label: 'Moderno' },
  { value: 'futurist', label: 'Futurista' },
];

/** Ordem dos grupos na biblioteca: do chão para cima, depois o que se põe dentro e em volta. */
const SECTIONS: ReadonlyArray<{ category: PieceCategory; title: string }> = [
  { category: 'floor', title: 'Chão' },
  { category: 'wall', title: 'Paredes' },
  { category: 'opening', title: 'Portas e janelas' },
  { category: 'roof', title: 'Telhados' },
  { category: 'stairs', title: 'Escadas e rampas' },
  { category: 'furniture', title: 'Móveis e adereços' },
  { category: 'vehicle', title: 'Veículos' },
  { category: 'structure', title: 'Estruturas' },
  { category: 'nature', title: 'Natureza' },
];

const SINGLE_CELL = { width: 1, depth: 1 } as const;

type Props = { brush: Brush; tool: Tool; dispatch: Dispatch<EditorAction> };

function isChosen(entry: CatalogEntry, { brush, tool }: Pick<Props, 'brush' | 'tool'>): boolean {
  if (entry.kind === 'floor') return tool === 'floor' && brush.floor === entry.key;
  if (entry.kind === 'wall') return tool === 'wall' && brush.wall === entry.key;
  return tool === 'prop' && brush.prop.source === 'catalog' && brush.prop.key === entry.key;
}

/** Escolher a peça liga a ferramenta certa; um objeto grande já vem com o tamanho dele em casas. */
function choose(entry: CatalogEntry, dispatch: Dispatch<EditorAction>): void {
  if (entry.kind === 'floor') return dispatch({ type: 'choose-floor', key: entry.key });
  if (entry.kind === 'wall') return dispatch({ type: 'choose-wall', key: entry.key });
  dispatch({ type: 'choose-prop', asset: { source: 'catalog', key: entry.key } });
  dispatch({ type: 'set-footprint', footprint: entry.footprint ?? SINGLE_CELL });
}

/** Dica do botão: nome e, para objeto maior que uma casa, o tamanho que ele ocupa. */
function pieceTitle(entry: CatalogEntry): string {
  const { footprint } = entry;
  if (!footprint || (footprint.width === 1 && footprint.depth === 1)) return entry.label;
  return `${entry.label} (${footprint.width}×${footprint.depth} casas)`;
}

/** Biblioteca de peças: filtro por estilo (mistura livre no mesmo mapa), busca e miniaturas. */
export function LibraryPanel({ brush, tool, dispatch }: Props) {
  const [query, setQuery] = useState('');
  const [style, setStyle] = useState<StyleFilter>('all');
  const found = pieceCatalog.search(query, { style });
  const sections = SECTIONS.map((section) => ({
    ...section,
    entries: found.filter((entry) => entry.category === section.category),
  }));

  return (
    <div className={styles.stack}>
      <SegmentedControl
        label="Estilo das peças"
        options={STYLE_OPTIONS}
        value={style}
        onChange={setStyle}
      />
      <TextField
        label="Buscar peça"
        type="search"
        placeholder="Ex: tocha, carro, parede"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {found.length === 0 && (
        <EmptyState
          icon={<Search size={22} />}
          title="Nenhuma peça encontrada"
          description="Tente outra palavra (sem se preocupar com acentos) ou outro estilo."
        />
      )}
      {sections.map(
        (section) =>
          section.entries.length > 0 && (
            <section key={section.category} aria-label={section.title}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
              <ul className={styles.grid}>
                {section.entries.map((entry) => (
                  <li key={entry.key}>
                    <button
                      type="button"
                      className={styles.piece}
                      aria-pressed={isChosen(entry, { brush, tool })}
                      title={pieceTitle(entry)}
                      onClick={() => choose(entry, dispatch)}
                    >
                      <PieceThumbnail
                        source={{ type: 'piece', key: entry.key }}
                        icon={entry.icon}
                      />
                      <span className={styles.pieceLabel}>{entry.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
      <MyModelsSection query={query} brush={brush} tool={tool} dispatch={dispatch} />
    </div>
  );
}
