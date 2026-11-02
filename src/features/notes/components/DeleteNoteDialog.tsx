import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Dialog, notify } from '@/components';
import { FormNotice } from '@/features/auth';
import { useNotes } from '../hooks/notes-context';
import { reportNoteFailure } from '../services/report-note-failure';
import type { Note } from '../types';

export type DeleteNoteDialogProps = {
  open: boolean;
  /** A anotação a apagar; nula só enquanto a janela nunca foi aberta. */
  note: Note | null;
  onClose: () => void;
};

/** Confirmação antes de apagar: a anotação some para todos que a receberam, com a imagem. */
export function DeleteNoteDialog({ open, note, onClose }: DeleteNoteDialogProps) {
  const { deleteNote } = useNotes();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleClose() {
    if (pending) return;
    onClose();
  }

  async function handleDelete() {
    if (!note) return;
    setFailure(null);
    setPending(true);
    try {
      await deleteNote(note);
    } catch (error) {
      setFailure(reportNoteFailure(error, { action: 'delete' }));
      return;
    } finally {
      setPending(false);
    }
    notify.success('Anotação apagada.');
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Apagar anotação?"
      description="Ela some para todos que a receberam, junto com a imagem. Não dá para desfazer."
      footer={
        <>
          <Button variant="ghost" disabled={pending} onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={pending}
            icon={<Trash2 size={16} />}
            onClick={handleDelete}
          >
            Apagar de vez
          </Button>
        </>
      }
    >
      {note && (
        <p>
          Você vai apagar <strong>{note.title}</strong>.
        </p>
      )}
      {failure && <FormNotice tone="error">{failure}</FormNotice>}
    </Dialog>
  );
}
