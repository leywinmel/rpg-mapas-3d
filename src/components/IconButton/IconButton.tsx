import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './IconButton.module.css';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Obrigatório: é o que o leitor de tela fala e o que aparece ao passar o mouse. */
  label: string;
  icon: ReactNode;
  size?: 'sm' | 'md';
  /** Ferramenta selecionada (ex: pincel de névoa ligado). */
  active?: boolean;
};

export function IconButton({
  label,
  icon,
  size = 'md',
  active,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(
        styles.iconButton,
        size === 'sm' && styles.sm,
        active && styles.active,
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
