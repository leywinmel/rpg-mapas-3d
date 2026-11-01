import { useState, type Dispatch } from 'react';
import { Search } from 'lucide-react';
import { EmptyState, TextField } from '@/components';
import { pieceCatalog, type CatalogEntry, type PieceKind } from '@/features/scene';
import type { Brush, EditorAction, Tool } from '../editor/editor-reducer';
import { MyModelsSection } from './MyModelsSection';
import { PieceThumbnail } from './PieceThumbnail';
import styles from './SidePanel.module.css';

const SECTIONS: ReadonlyArray<{ kind: PieceKind; title: string }> = [
  { kind: 'floor', title: 'Chão' },
  { kind: 'wall', title: 'Paredes' },
  { kind: 'prop', title: 'Objetos' },
];

type Props = { brush: Brush; tool: Tool; dispatch: Dispatch<EditorAction> };

function isChosen(entry: CatalogEntry, { brush, tool }: Pick<Props, 'brush' | 'tool'>): boolean {
  if (entry.kind === 'floor') return tool === 'floor' && brush.floor === entry.key;
  if (entry.kind === 'wall') return tool === 'wall' && brush.wall === entry.key;
  return tool === 'prop' && brush.prop.source === 'catalog' && brush.prop.key === entry.key;
}

function choose(entry: CatalogEntry): EditorAction {
  if (entry.kind === 'floor') return { type: 'choose-floor', key: entry.key };
  if (entry.kind === 'wall') return { type: 'choose-wall', key: entry.key };
  return { type: 'choose-prop', asset: { source: 'catalog', key: entry.key } };
}

/** Biblioteca de peças: clicar escolhe o pincel e já liga a ferramenta certa. */
export function LibraryPanel({ brush, tool, dispatch }: Props) {
  const [query, setQuery] = useState('');
  const sections = SECTIONS.map((section) => ({
    ...section,
    entries: pieceCatalog.search(query, section.kind),
  }));
  const nothingFound = sections.every((section) => section.entries.length === 0);

  return (
    <div className={styles.stack}>
      <TextField
        label="Buscar peça"
        type="search"
        placeholder="Ex: tocha, pedra, baú"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {nothingFound && (
        <EmptyState
          icon={<Search size={22} />}
          title="Nenhuma peça encontrada"
          description="Tente outra palavra, sem se preocupar com acentos."
        />
      )}
      {sections.map(
        (section) =>
          section.entries.length > 0 && (
            <section key={section.kind} aria-label={section.title}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
              <ul className={styles.grid}>
                {section.entries.map((entry) => (
                  <li key={entry.key}>
                    <button
                      type="button"
                      className={styles.piece}
                      aria-pressed={isChosen(entry, { brush, tool })}
                      title={entry.label}
                      onClick={() => dispatch(choose(entry))}
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
