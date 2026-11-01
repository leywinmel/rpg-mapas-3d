import { useId } from 'react';
import { Lock, Pencil, Trash2, Users } from 'lucide-react';
import { IconButton } from '@/components';
import { describeAudience, formatNoteTime } from '../format';
import { useNotes } from '../hooks/notes-context';
import type { Note } from '../types';
import { NoteBody } from './NoteBody';
import { NoteImage } from './NoteImage';
import styles from './notes.module.css';

export type NoteCardProps = {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
};

/**
 * Um cartão da lista: título, hora, para quem foi, o texto e a imagem. Título e texto são
 * texto de usuário e entram só como texto, nunca como HTML. Editar e apagar são do mestre.
 */
export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const { canManage, members } = useNotes();
  const titleId = useId();
  const AudienceIcon = note.toAll ? Users : Lock;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <header className={styles.cardHeader}>
        <div className={styles.cardHeading}>
          <h3 id={titleId} className={styles.cardTitle}>
            {note.title}
          </h3>
          <time className={styles.cardTime} dateTime={note.createdAt}>
            {formatNoteTime(note.createdAt)}
          </time>
        </div>
        {canManage && (
          <div className={styles.cardActions}>
            <IconButton
              size="sm"
              label={`Editar a anotação “${note.title}”`}
              icon={<Pencil size={14} />}
              onClick={() => onEdit(note)}
            />
            <IconButton
              size="sm"
              label={`Apagar a anotação “${note.title}”`}
              icon={<Trash2 size={14} />}
              onClick={() => onDelete(note)}
            />
          </div>
        )}
      </header>
      <p className={styles.audience}>
        <AudienceIcon className={styles.audienceIcon} size={12} aria-hidden="true" />
        {describeAudience(note, { canManage, members })}
      </p>
      <NoteBody text={note.body} />
      {note.imagePath && <NoteImage path={note.imagePath} title={note.title} />}
    </article>
  );
}
