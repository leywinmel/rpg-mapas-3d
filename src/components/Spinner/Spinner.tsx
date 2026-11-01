import { cx } from '@/lib/cx';
import styles from './Spinner.module.css';

export type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  /** Texto lido pelo leitor de tela. */
  label?: string;
};

export function Spinner({ size = 'md', label = 'Carregando' }: SpinnerProps) {
  return (
    <span role="status" className={cx(styles.spinner, size !== 'md' && styles[size])}>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
