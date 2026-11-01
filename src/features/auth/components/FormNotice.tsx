import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './auth.module.css';

export type NoticeTone = 'error' | 'success' | 'info';

/**
 * Aviso dentro do formulário ou da janela. Erro usa role="alert" para o leitor de
 * tela anunciar na hora; os outros, role="status" (anúncio sem interromper).
 */
export function FormNotice({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cx(styles.notice, styles[tone])}>
      {children}
    </p>
  );
}
