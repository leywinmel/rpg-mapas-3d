import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cx } from '@/lib/cx';
import { IconButton } from '../IconButton/IconButton';
import { TOAST_DURATION_MS, useToastStore, type Toast, type ToastTone } from './toast-store';
import styles from './ToastViewport.module.css';

const ICONS: Record<ToastTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const Icon = ICONS[toast.tone];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), TOAST_DURATION_MS[toast.tone]);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id, toast.tone]);

  return (
    <li
      className={cx(styles.toast, styles[toast.tone])}
      // Erro interrompe o leitor de tela; o resto espera a vez.
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon size={18} />
      </span>
      <div>
        <p className={styles.title}>{toast.title}</p>
        {toast.description && <p className={styles.description}>{toast.description}</p>}
      </div>
      <IconButton
        label="Fechar aviso"
        icon={<X size={14} />}
        size="sm"
        onClick={() => dismiss(toast.id)}
      />
    </li>
  );
}

/** Pilha de avisos no canto da tela. Montada uma vez no App. */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  return (
    <ol className={styles.viewport} aria-label="Avisos">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ol>
  );
}
