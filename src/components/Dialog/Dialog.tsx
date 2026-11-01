import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../IconButton/IconButton';
import styles from './Dialog.module.css';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Botões de ação, alinhados à direita no rodapé. */
  footer?: ReactNode;
};

/**
 * Janela modal sobre o <dialog> nativo: o navegador já prende o foco dentro,
 * fecha com Esc e devolve o foco a quem abriu.
 */
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onCancel={(event) => {
        // Deixa o React controlar o fechamento para o estado não divergir.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clique no fundo escurecido fecha.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className={styles.header}>
        <div>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className={styles.description}>
              {description}
            </p>
          )}
        </div>
        <IconButton label="Fechar" icon={<X size={18} />} size="sm" onClick={onClose} />
      </header>
      {children && <div className={styles.body}>{children}</div>}
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </dialog>
  );
}
