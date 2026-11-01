import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/lib/cx';
import { IconButton } from '../IconButton/IconButton';
import styles from './Panel.module.css';

export type PanelProps = {
  title: string;
  icon?: ReactNode;
  /** Botões extras no cabeçalho (ex: "nova anotação"). */
  actions?: ReactNode;
  onClose?: () => void;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Painel lateral da sala (tokens, dados, anotações, iniciativa, ferramentas do editor). */
export function Panel({ title, icon, actions, onClose, footer, className, children }: PanelProps) {
  const titleId = useId();
  return (
    <section className={cx(styles.panel, className)} aria-labelledby={titleId}>
      <header className={styles.header}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.actions}>
          {actions}
          {onClose && (
            <IconButton
              label={`Fechar ${title}`}
              icon={<X size={16} />}
              size="sm"
              onClick={onClose}
            />
          )}
        </div>
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
  );
}
