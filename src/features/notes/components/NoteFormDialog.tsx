import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Save, Send } from 'lucide-react';
import { Button, Dialog, notify, TextAreaField, TextField } from '@/components';
import { FormNotice } from '@/features/auth';
import { validateForm, type FieldErrors } from '@/lib/validation';
import { NOTE_BODY_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH } from '../constants';
import { useNotes } from '../hooks/notes-context';
import { countCharacters, noteDraftSchema, noteEditSchema } from '../schemas';
import { reportNoteFailure } from '../services/report-note-failure';
import type { Note, NoteRecipients } from '../types';
import { ImageField } from './ImageField';
import { RecipientsField } from './RecipientsField';
import { revealFirstError } from './reveal-error';
import styles from './notes.module.css';

/** Nova anotação ou edição de uma que já foi enviada (só título e texto). */
export type NoteFormTarget = { mode: 'create' } | { mode: 'edit'; note: Note };

type FormFields = { title: string; body: string; image: File | null; recipients: NoteRecipients };

export type NoteFormDialogProps = {
  open: boolean;
  target: NoteFormTarget;
  onClose: () => void;
};

/**
 * A janela de escrever (ou editar) uma anotação. O estado nasce da `target` quando a janela é
 * montada; quem usa remonta a cada abertura (key), então ela sempre abre limpa ou com a anotação
 * escolhida. O erro do envio aparece aqui dentro: os avisos do canto ficam atrás da janela.
 */
export function NoteFormDialog({ open, target, onClose }: NoteFormDialogProps) {
  const { members, sendNote, updateNote } = useNotes();
  const editing = target.mode === 'edit' ? target.note : null;
  const formId = useId();
  const titleId = useId();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [image, setImage] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<NoteRecipients>({ mode: 'all' });
  const [errors, setErrors] = useState<FieldErrors<FormFields>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [refusals, setRefusals] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const players = members.filter((member) => member.role === 'player');

  // A janela nativa foca o primeiro botão; quem vai escrever quer cair direto no título.
  useEffect(() => {
    if (open) document.getElementById(titleId)?.focus();
  }, [open, titleId]);

  // Depois de um envio recusado, leva a pessoa ao primeiro problema.
  useEffect(() => {
    if (refusals > 0) revealFirstError(formRef.current);
  }, [refusals]);

  function handleClose() {
    if (pending) return;
    onClose();
  }

  /** Roda o envio ou a edição; o erro fica na janela e o sucesso fecha e avisa. */
  async function run(action: () => Promise<void>, doneMessage: string) {
    setPending(true);
    try {
      await action();
    } catch (error) {
      setFailure(reportNoteFailure(error, { action: editing ? 'edit' : 'send' }));
      return;
    } finally {
      setPending(false);
    }
    notify.success(doneMessage);
    onClose();
  }

  async function submitEdit(note: Note) {
    const result = validateForm(noteEditSchema, { title, body });
    if (!result.ok) {
      setErrors(result.errors);
      setRefusals((count) => count + 1);
      return;
    }
    setErrors({});
    await run(() => updateNote({ noteId: note.id, ...result.data }), 'Anotação atualizada.');
  }

  async function submitNew() {
    // Quem saiu da mesa com a janela aberta não pode mais receber: sai da escolha.
    const playerIds = new Set(players.map((player) => player.userId));
    const chosen: NoteRecipients =
      recipients.mode === 'chosen'
        ? { mode: 'chosen', userIds: recipients.userIds.filter((id) => playerIds.has(id)) }
        : recipients;
    const result = validateForm(noteDraftSchema, { title, body, image, recipients: chosen });
    if (!result.ok) {
      setErrors(result.errors);
      setRefusals((count) => count + 1);
      return;
    }
    setErrors({});
    const toAll = result.data.recipients.mode === 'all';
    await run(
      () => sendNote(result.data),
      toAll ? 'Anotação enviada para a mesa toda.' : 'Anotação enviada aos jogadores escolhidos.',
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFailure(null);
    if (editing) await submitEdit(editing);
    else await submitNew();
  }

  const bodyLength = countCharacters(body);
  const bodyOverLimit =
    bodyLength > NOTE_BODY_MAX_LENGTH
      ? `O texto passa de ${NOTE_BODY_MAX_LENGTH} caracteres.`
      : undefined;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={editing ? 'Editar anotação' : 'Nova anotação'}
      description={
        editing
          ? 'Só o título e o texto mudam. Para trocar a imagem ou os destinatários, apague a anotação e mande de novo.'
          : 'Escreva e escolha quem recebe. A anotação fica salva na mesa.'
      }
      footer={
        <>
          <Button variant="ghost" disabled={pending} onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={pending}
            icon={editing ? <Save size={16} /> : <Send size={16} />}
          >
            {editing ? 'Salvar' : 'Enviar'}
          </Button>
        </>
      }
    >
      <form ref={formRef} id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          id={titleId}
          label="Título"
          name="title"
          value={title}
          maxLength={NOTE_TITLE_MAX_LENGTH}
          autoComplete="off"
          placeholder="Ex.: O mapa rasgado"
          error={errors.title}
          disabled={pending}
          onChange={(event) => setTitle(event.target.value)}
        />
        <TextAreaField
          label="Texto"
          name="body"
          value={body}
          rows={6}
          placeholder="O que o mestre quer contar…"
          hint={`${bodyLength}/${NOTE_BODY_MAX_LENGTH} caracteres`}
          error={errors.body ?? bodyOverLimit}
          disabled={pending}
          onChange={(event) => setBody(event.target.value)}
        />
        {!editing && (
          <>
            <ImageField
              file={image}
              error={errors.image}
              disabled={pending}
              onChange={(file) => {
                setImage(file);
                setErrors((current) => ({ ...current, image: undefined }));
              }}
              onReject={(message) => setErrors((current) => ({ ...current, image: message }))}
            />
            <RecipientsField
              value={recipients}
              players={players}
              error={errors.recipients}
              disabled={pending}
              onChange={(next) => {
                setRecipients(next);
                setErrors((current) => ({ ...current, recipients: undefined }));
              }}
            />
          </>
        )}
        {failure && <FormNotice tone="error">{failure}</FormNotice>}
      </form>
    </Dialog>
  );
}
