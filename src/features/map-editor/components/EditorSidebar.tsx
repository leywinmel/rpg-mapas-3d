import { useId, useState, type ReactNode } from 'react';
import { Hammer } from 'lucide-react';
import { Panel } from '@/components';
import styles from './SidePanel.module.css';
import layout from './MapWorkspace.module.css';

export type SidebarTab = { id: string; label: string; content: ReactNode };

/** Painel lateral do mestre com abas (biblioteca, mapas, ambiente). */
export function EditorSidebar({ title, tabs }: { title: string; tabs: readonly SidebarTab[] }) {
  const baseId = useId();
  const [chosen, setChosen] = useState(tabs[0]?.id ?? '');
  const current = tabs.find((tab) => tab.id === chosen) ?? tabs[0];
  return (
    <div className={layout.sidebar}>
      <Panel title={title} icon={<Hammer size={16} />} className={layout.sidebarPanel}>
        <div className={styles.stack}>
          {tabs.length > 1 && (
            <div role="tablist" aria-label="Seções do editor" className={styles.tabs}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-${tab.id}-tab`}
                  aria-controls={`${baseId}-${tab.id}`}
                  aria-selected={tab.id === current?.id}
                  className={styles.tab}
                  onClick={() => setChosen(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          {current && (
            <div
              role="tabpanel"
              id={`${baseId}-${current.id}`}
              aria-labelledby={`${baseId}-${current.id}-tab`}
            >
              {current.content}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
