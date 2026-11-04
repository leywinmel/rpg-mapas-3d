import type { ReactNode } from 'react';
import styles from './MapCornerHud.module.css';

/**
 * Canto direito do mapa (minimapa e corte de andares), acima do canto dos dados: longe das
 * ferramentas do editor (embaixo) e do painel de quem está na mesa (em cima).
 */
export function MapCornerHud({ children }: { children: ReactNode }) {
  return <div className={styles.corner}>{children}</div>;
}
