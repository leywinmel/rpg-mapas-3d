import { NotebookPen } from 'lucide-react';
import { IconButton } from '@/components';
import { notesButtonLabel } from '../format';
import { useNotes } from '../hooks/notes-context';
import styles from './notes.module.css';

/** Acima disto o selo mostra "9+": o número exato está no nome acessível do botão. */
const MAX_BADGE_COUNT = 9;

export type NotesButtonProps = {
  /** O painel das anotações está aberto. */
  active: boolean;
  onClick: () => void;
};

/** Botão da barra do topo: abre e fecha as anotações e mostra quantas ainda não foram lidas. */
export function NotesButton({ active, onClick }: NotesButtonProps) {
  const { unreadCount } = useNotes();
  return (
    <IconButton
      label={notesButtonLabel(unreadCount)}
      icon={
        <span className={styles.buttonIcon}>
          <NotebookPen size={18} />
          {unreadCount > 0 && (
            <span className={styles.badge}>
              {unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : unreadCount}
            </span>
          )}
        </span>
      }
      active={active}
      onClick={onClick}
    />
  );
}
