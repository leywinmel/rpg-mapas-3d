import { useEffect, useId, useMemo, useRef, type ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button, IconButton } from '@/components';
import { NOTE_IMAGE_MAX_MEGABYTES, NOTE_IMAGE_MIME_TYPES } from '../constants';
import { formatFileSize } from '../note-image';
import { checkNoteImage } from '../schemas';
import styles from './notes.module.css';

const ACCEPT = NOTE_IMAGE_MIME_TYPES.join(',');

/** Prévia da imagem escolhida; a URL temporária é devolvida ao navegador quando não serve mais. */
function useFilePreview(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

export type ImageFieldProps = {
  file: File | null;
  /** Erro do campo: do arquivo recusado ao escolher ou do envio. */
  error?: string;
  disabled?: boolean;
  /** Imagem aceita; nula quando a pessoa remove. */
  onChange: (file: File | null) => void;
  /** Arquivo recusado (tipo ou tamanho): nada é guardado, a frase explica. */
  onReject: (message: string) => void;
};

/** Imagem opcional da anotação: escolher o arquivo, ver a prévia e remover. */
export function ImageField({ file, error, disabled, onChange, onReject }: ImageFieldProps) {
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useFilePreview(file);

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    // Limpa o campo para escolher o mesmo arquivo de novo depois de remover.
    event.target.value = '';
    if (!picked) return;
    const problem = checkNoteImage(picked);
    if (problem) onReject(problem);
    else onChange(picked);
  }

  return (
    <div className={styles.imageField}>
      <span id={labelId} className={styles.legend}>
        Imagem (opcional)
      </span>
      {/* O seletor nativo fica escondido; o botão abaixo o abre e é o que o teclado alcança. */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        aria-labelledby={labelId}
        onChange={handlePick}
      />
      {file ? (
        <div className={styles.imageRow}>
          {preview && (
            <img className={styles.previewImage} src={preview} alt="Prévia da imagem escolhida" />
          )}
          <span className={styles.imageInfo}>
            <span className={styles.imageName}>{file.name}</span>
            <span className={styles.imageSize}>{formatFileSize(file.size)}</span>
          </span>
          <IconButton
            label="Remover a imagem"
            icon={<X size={16} />}
            size="sm"
            disabled={disabled}
            onClick={() => onChange(null)}
          />
        </div>
      ) : (
        <Button
          variant="secondary"
          icon={<ImagePlus size={16} />}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Escolher imagem
        </Button>
      )}
      <span className={styles.hint}>PNG, JPEG ou WebP, até {NOTE_IMAGE_MAX_MEGABYTES} MB.</span>
      {error && (
        <span role="alert" className={styles.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
}
