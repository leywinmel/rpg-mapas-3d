import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Aparência compartilhada com links que parecem botão (ver ButtonLink). */
export type ButtonLookProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
};

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  block = false,
}: ButtonLookProps): string {
  return cx(styles.button, styles[variant], size !== 'md' && styles[size], block && styles.block);
}
