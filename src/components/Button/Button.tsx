import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import { Spinner } from '../Spinner/Spinner';
import { buttonClassName, type ButtonLookProps } from './button-look';
import styles from './Button.module.css';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonLookProps & {
    /** Mostra o carregamento e bloqueia novos cliques enquanto a ação roda. */
    loading?: boolean;
  };

export function Button({
  variant,
  size,
  block,
  icon,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClassName({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" label="Carregando" />
      ) : (
        icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )
      )}
      {children}
    </button>
  );
}
