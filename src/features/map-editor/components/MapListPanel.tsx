import { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Eye, PencilLine, Plus, Radio, Trash } from 'lucide-react';
import { Button, EmptyState, IconButton } from '@/components';
import { cx } from '@/lib/cx';
import { sortMaps, type MoveDirection, type NewMapInput } from '../editor/map-list';
import type { MapActions } from '../hooks/useMapActions';
import type { MapSummary } from '../types';
import { CreateMapDialog, DeleteMapDialog, RenameMapDialog } from './MapFormDialog';
import styles from './SidePanel.module.css';

const ICON_SIZE = 14;

export type MapListPanelProps = {
  maps: readonly MapSummary[];
  activeMapId: string | null;
  /** Mapa aberto no editor do mestre (pode não ser o que a mesa está vendo). */
  selectedMapId: string | null;
  onSelect: (mapId: string | null) => void;
  actions: MapActions;
};

/** Lista de mapas da mesa: abrir no editor, mostrar à mesa, renomear, duplicar, ordenar, apagar. */
export function MapListPanel({
  maps,
  activeMapId,
  selectedMapId,
  onSelect,
  actions,
}: MapListPanelProps) {
  const [creating, setCreating] = useState(0);
  const [renaming, setRenaming] = useState<MapSummary | null>(null);
  const [deleting, setDeleting] = useState<MapSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const ordered = sortMaps(maps);

  /** Ações rápidas da lista (sem diálogo): o erro aparece logo abaixo da lista. */
  const quick = async (mapId: string, run: () => Promise<unknown>, message: string) => {
    setBusyId(mapId);
    setFailure(null);
    try {
      await run();
    } catch {
      setFailure(message);
    } finally {
      setBusyId(null);
    }
  };

  const create = async (input: NewMapInput) => {
    const summary = await actions.create(input);
    setCreating(0);
    onSelect(summary.id);
  };

  const duplicate = (map: MapSummary) =>
    quick(
      map.id,
      async () => onSelect((await actions.duplicate(map)).id),
      'Não conseguimos duplicar o mapa.',
    );

  const move = (map: MapSummary, direction: MoveDirection) =>
    quick(map.id, () => actions.move(map.id, direction), 'Não conseguimos mudar a ordem.');

  const remove = async () => {
    if (!deleting) return;
    await actions.remove(deleting.id);
    if (selectedMapId === deleting.id) onSelect(null);
    setDeleting(null);
  };

  return (
    <div className={styles.stack}>
      <Button icon={<Plus size={16} />} block onClick={() => setCreating((value) => value + 1)}>
        Novo mapa
      </Button>
      {ordered.length === 0 && (
        <EmptyState
          title="Nenhum mapa ainda"
          description="Crie o primeiro mapa da mesa para começar a montar o diorama."
        />
      )}
      <ul className={styles.mapList}>
        {ordered.map((map, index) => {
          const active = map.id === activeMapId;
          const selected = map.id === selectedMapId;
          const busy = busyId === map.id;
          return (
            <li key={map.id} className={cx(styles.mapItem, selected && styles.mapItemSelected)}>
              <button
                type="button"
                className={styles.mapOpen}
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(map.id)}
              >
                <span className={styles.mapName}>{map.name}</span>
                <span className={styles.mapMeta}>
                  {map.width} × {map.depth}
                  {active && (
                    <span className={styles.badge}>
                      <Radio size={12} aria-hidden="true" /> Na mesa
                    </span>
                  )}
                </span>
              </button>
              <div className={styles.mapActions}>
                <IconButton
                  label={
                    active ? 'A mesa já está vendo este mapa' : 'Mostrar este mapa para a mesa'
                  }
                  icon={<Eye size={ICON_SIZE} />}
                  size="sm"
                  active={active}
                  disabled={active || busy}
                  onClick={() =>
                    void quick(
                      map.id,
                      () => actions.activate(map.id),
                      'Não conseguimos trocar o mapa da mesa.',
                    )
                  }
                />
                <IconButton
                  label="Renomear"
                  icon={<PencilLine size={ICON_SIZE} />}
                  size="sm"
                  disabled={busy}
                  onClick={() => setRenaming(map)}
                />
                <IconButton
                  label="Duplicar"
                  icon={<Copy size={ICON_SIZE} />}
                  size="sm"
                  disabled={busy}
                  onClick={() => void duplicate(map)}
                />
                <IconButton
                  label="Subir na lista"
                  icon={<ArrowUp size={ICON_SIZE} />}
                  size="sm"
                  disabled={busy || index === 0}
                  onClick={() => void move(map, 'up')}
                />
                <IconButton
                  label="Descer na lista"
                  icon={<ArrowDown size={ICON_SIZE} />}
                  size="sm"
                  disabled={busy || index === ordered.length - 1}
                  onClick={() => void move(map, 'down')}
                />
                <IconButton
                  label={`Apagar ${map.name}`}
                  icon={<Trash size={ICON_SIZE} />}
                  size="sm"
                  disabled={busy}
                  onClick={() => setDeleting(map)}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {failure && (
        <p className={styles.error} role="alert">
          {failure}
        </p>
      )}
      <CreateMapDialog
        key={creating}
        open={creating > 0}
        onClose={() => setCreating(0)}
        onCreate={create}
        generator={{
          actions,
          onGenerated: (summary) => {
            setCreating(0);
            onSelect(summary.id);
          },
        }}
      />
      <RenameMapDialog
        key={renaming?.id ?? 'closed'}
        currentName={renaming?.name ?? null}
        onClose={() => setRenaming(null)}
        onRename={async (name) => {
          if (!renaming) return;
          await actions.rename(renaming.id, name);
          setRenaming(null);
        }}
      />
      <DeleteMapDialog
        mapName={deleting?.name ?? null}
        onClose={() => setDeleting(null)}
        onDelete={remove}
      />
    </div>
  );
}
