import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Button, buttonClassName, Dialog } from '@/components';
import { useAsyncData } from '@/lib/use-async-data';
import { useNotes } from '../hooks/notes-context';
import { NOTE_ERROR_MESSAGES } from '../services/note-errors';
import { reportNoteFailure } from '../services/report-note-failure';
import styles from './notes.module.css';

/**
 * A miniatura da imagem da anotação; clicar abre a imagem grande. O bucket é privado, então
 * a imagem vem por URL assinada. Se ela não carregar, um aviso toma o lugar: o cartão não quebra.
 */
export function NoteImage({ path, title }: { path: string; title: string }) {
  const { getImageUrl } = useNotes();
  const image = useAsyncData(`note-image:${path}`, () =>
    getImageUrl(path).catch((error: unknown) => {
      reportNoteFailure(error, { action: 'image-url' });
      throw error;
    }),
  );
  const [broken, setBroken] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  if (image.status === 'loading') {
    return (
      <div className={styles.imageLoading} role="status">
        <span className="visually-hidden">Carregando a imagem…</span>
      </div>
    );
  }
  if (image.status === 'error' || broken) {
    return (
      <p className={styles.imageFallback} role="status">
        <ImageOff size={16} aria-hidden="true" />
        {NOTE_ERROR_MESSAGES['image-url']}
      </p>
    );
  }

  const url = image.data;
  const closeZoom = () => setZoomed(false);
  return (
    <>
      <button
        type="button"
        className={styles.thumbButton}
        aria-label={`Ampliar a imagem de “${title}”`}
        onClick={() => setZoomed(true)}
      >
        <img
          className={styles.thumb}
          src={url}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      </button>
      <Dialog
        open={zoomed}
        onClose={closeZoom}
        title={title}
        footer={
          <>
            <a
              className={buttonClassName({ variant: 'secondary' })}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir original
            </a>
            <Button onClick={closeZoom}>Fechar</Button>
          </>
        }
      >
        {zoomed && <img className={styles.largeImage} src={url} alt={title} />}
      </Dialog>
    </>
  );
}
