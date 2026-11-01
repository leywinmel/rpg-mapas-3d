import { Link, type LinkProps } from 'react-router-dom';
import { cx } from '@/lib/cx';
import { buttonClassName, type ButtonLookProps } from './button-look';
import styles from './Button.module.css';

/** Navegação com cara de botão (continua sendo um link para o leitor de tela). */
export function ButtonLink({
  variant,
  size,
  block,
  icon,
  className,
  children,
  ...rest
}: LinkProps & ButtonLookProps) {
  return (
    <Link className={cx(buttonClassName({ variant, size, block }), className)} {...rest}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </Link>
  );
}
