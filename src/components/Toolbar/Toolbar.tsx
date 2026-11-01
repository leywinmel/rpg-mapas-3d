import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Toolbar.module.css';

export type ToolbarProps = {
  /** Nome do grupo para o leitor de tela (ex: "Ferramentas do editor"). */
  label: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children: ReactNode;
};

/** Barra flutuante de ferramentas da sala, feita de IconButtons. */
export function Toolbar({ label, orientation = 'horizontal', className, children }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
      className={cx(styles.toolbar, orientation === 'vertical' && styles.vertical, className)}
    >
      {children}
    </div>
  );
}

export function ToolbarSeparator() {
  return <span role="separator" className={styles.separator} />;
}
