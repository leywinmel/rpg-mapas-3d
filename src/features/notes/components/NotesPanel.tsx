import { useState } from 'react';
import { NotebookPen, Plus } from 'lucide-react';
import { Button, EmptyState, ErrorBoundary, ErrorState, LoadingState, Panel } from '@/components';
import { useNotes } from '../hooks/notes-context';
import { noteErrorMessage } from '../services/note-errors';
import type { Note } from '../types';
import { DeleteNoteDialog } from './DeleteNoteDialog';
import { NoteCard } from './NoteCard';
import { NoteFormDialog, type NoteFormTarget } from './NoteFormDialog';
import styles from './notes.module.css';

type NotesBodyProps = {
  onCreate: () => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
};

/** O que o painel mostra por dentro: carregando, erro, vazio ou a lista de cartões. */
function NotesBody({ onCreate, onEdit, onDelete }: NotesBodyProps) {
  const { feed, canManage, reload, loadMore, loadingMore } = useNotes();

  if (feed.status === 'loading') return <LoadingState label="Carregando as anotações…" />;
  if (feed.status === 'error') {
    return (
      <ErrorState
        title="Não deu para carregar as anotações"
        description={noteErrorMessage(feed.error)}
        onRetry={reload}
      />
    );
  }
  if (feed.notes.length === 0) {
    return canManage ? (
      <EmptyState
        icon={<NotebookPen size={22} />}
        title="Nenhuma anotação enviada ainda"
        description="Escreva uma anotação e mande para a mesa toda ou só para quem você escolher."
        action={
          <Button icon={<Plus size={16} />} onClick={onCreate}>
            Escrever a primeira
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={<NotebookPen size={22} />}
        title="O mestre ainda não mandou anotações"
        description="Quando ele mandar, a anotação aparece aqui na hora."
      />
    );
  }

  return (
    <>
      <ul className={styles.list}>
        {feed.notes.map((note) => (
          <li key={note.id}>
            <NoteCard note={note} onEdit={onEdit} onDelete={onDelete} />
          </li>
        ))}
      </ul>
      {feed.hasMore && (
        <div className={styles.loadMore}>
          <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
            Ver mais antigas
          </Button>
        </div>
      )}
    </>
  );
}

/** Uma janela por vez; `session` muda a cada abertura para ela abrir sempre do zero. */
type FormState = { target: NoteFormTarget; open: boolean; session: number };
type DeleteState = { note: Note | null; open: boolean; session: number };

/**
 * O painel "Anotações" da sala: a lista para todos e, para o mestre, o envio, a edição e a
 * exclusão. Abre no canto da barra, no lugar do painel de presença.
 */
export function NotesPanel({ onClose }: { onClose: () => void }) {
  const { canManage } = useNotes();
  const [form, setForm] = useState<FormState>({
    target: { mode: 'create' },
    open: false,
    session: 0,
  });
  const [removal, setRemoval] = useState<DeleteState>({ note: null, open: false, session: 0 });

  const openForm = (target: NoteFormTarget) =>
    setForm((current) => ({ target, open: true, session: current.session + 1 }));
  const closeForm = () =>
    setForm((current) => (current.open ? { ...current, open: false } : current));
  const openRemoval = (note: Note) =>
    setRemoval((current) => ({ note, open: true, session: current.session + 1 }));
  const closeRemoval = () =>
    setRemoval((current) => (current.open ? { ...current, open: false } : current));

  return (
    <>
      <Panel
        title="Anotações"
        icon={<NotebookPen size={16} />}
        actions={
          canManage ? (
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => openForm({ mode: 'create' })}
            >
              Nova anotação
            </Button>
          ) : undefined
        }
        onClose={onClose}
        className={styles.panel}
      >
        <ErrorBoundary area="a lista de anotações">
          <NotesBody
            onCreate={() => openForm({ mode: 'create' })}
            onEdit={(note) => openForm({ mode: 'edit', note })}
            onDelete={openRemoval}
          />
        </ErrorBoundary>
      </Panel>
      {canManage && (
        <>
          <NoteFormDialog
            key={`form-${form.session}`}
            open={form.open}
            target={form.target}
            onClose={closeForm}
          />
          <DeleteNoteDialog
            key={`delete-${removal.session}`}
            open={removal.open}
            note={removal.note}
            onClose={closeRemoval}
          />
        </>
      )}
    </>
  );
}
