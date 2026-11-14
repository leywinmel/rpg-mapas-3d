import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { HUD_CHROME_CLASS } from './EditorSidebar';
import styles from './MapCornerHud.module.css';

/**
 * Canto direito do mapa (minimapa e corte de andares), acima do canto dos dados: longe das
 * ferramentas do editor (embaixo) e do painel de quem está na mesa (em cima).
 */
export function MapCornerHud({ children }: { children: ReactNode }) {
  return <div className={cx(styles.corner, HUD_CHROME_CLASS)}>{children}</div>;
}
