import { AlertTriangle, Check, CloudUpload, PencilLine } from 'lucide-react';
import { Button, Spinner } from '@/components';
import { cx } from '@/lib/cx';
import type { SaveStatus } from '../hooks/useAutosave';
import styles from './SaveIndicator.module.css';

const ICON_SIZE = 14;

const LABELS: Readonly<Record<SaveStatus, string>> = {
  saved: 'Salvo',
  dirty: 'Alterações não salvas',
  saving: 'Salvando…',
  error: 'Erro ao salvar',
};

/** Mostra se o mapa já está no banco; no erro, oferece gravar de novo. */
export function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  return (
    <div className={cx(styles.indicator, styles[status])} role="status" aria-live="polite">
      {status === 'saving' && <Spinner size="sm" label="Salvando" />}
      {status === 'saved' && <Check size={ICON_SIZE} aria-hidden="true" />}
      {status === 'dirty' && <PencilLine size={ICON_SIZE} aria-hidden="true" />}
      {status === 'error' && <AlertTriangle size={ICON_SIZE} aria-hidden="true" />}
      <span>{LABELS[status]}</span>
      {status === 'error' && (
        <Button variant="ghost" size="sm" icon={<CloudUpload size={ICON_SIZE} />} onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
