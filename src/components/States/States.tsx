import type { ReactNode } from 'react';
import { AlertOctagon, Inbox, RotateCcw } from 'lucide-react';
import { cx } from '@/lib/cx';
import { Button } from '../Button/Button';
import { Spinner } from '../Spinner/Spinner';
import styles from './States.module.css';

type StateLayout = {
  /** Ocupa a altura toda do contêiner (telas e painéis). */
  fill?: boolean;
};

export function LoadingState({ label = 'Carregando…', fill }: { label?: string } & StateLayout) {
  return (
    <div className={cx(styles.state, fill && styles.fill)}>
      <Spinner size="lg" label={label} />
      <p className={styles.description} aria-hidden="true">
        {label}
      </p>
    </div>
  );
}

export type EmptyStateProps = StateLayout & {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Ação principal sugerida (ex: botão "Criar primeiro mapa"). */
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, action, fill }: EmptyStateProps) {
  return (
    <div className={cx(styles.state, fill && styles.fill)}>
      <span className={styles.icon} aria-hidden="true">
        {icon ?? <Inbox size={22} />}
      </span>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}

export type ErrorStateProps = StateLayout & {
  title?: string;
  /** Mensagem amigável. O detalhe técnico vai só para o log. */
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
};

export function ErrorState({
  title = 'Algo deu errado',
  description = 'Não conseguimos carregar esta parte. Tente de novo em instantes.',
  onRetry,
  action,
  fill,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cx(styles.state, styles.error, fill && styles.fill)}>
      <span className={styles.icon} aria-hidden="true">
        <AlertOctagon size={22} />
      </span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {(onRetry || action) && (
        <div className={styles.actions}>
          {onRetry && (
            <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={onRetry}>
              Tentar de novo
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
