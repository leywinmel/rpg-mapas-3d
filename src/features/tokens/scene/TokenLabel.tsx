import { Html } from '@react-three/drei';
import { EyeOff } from 'lucide-react';
import { healthFraction } from '@/domain';
import { cx } from '@/lib/cx';
import type { Token } from '../types';
import styles from './token-label.module.css';

/** Abaixo disto a barra de vida fica vermelha. */
const LOW_HEALTH_FRACTION = 0.34;
/** Etiquetas ficam abaixo dos painéis da barra (que usam z-index bem maiores). */
const LABEL_Z_RANGE = [10, 0];

/**
 * Nome e vida flutuando sobre o token. É texto do React, nunca HTML vindo do usuário [#53].
 * A etiqueta não pega o mouse: clicar nela é clicar no token embaixo.
 */
export function TokenLabel({ token, height }: { token: Token; height: number }) {
  const hasHealth = token.hpMax !== null && token.hpMax > 0 && token.hpCurrent !== null;
  const fraction = hasHealth
    ? healthFraction({ current: token.hpCurrent ?? 0, max: token.hpMax ?? 0 })
    : 0;
  return (
    <Html position={[0, height, 0]} center zIndexRange={LABEL_Z_RANGE} pointerEvents="none">
      <div className={styles.label}>
        <span className={styles.name}>
          {token.hidden && <EyeOff size={12} aria-label="Escondido dos jogadores" />}
          {token.name}
        </span>
        {hasHealth && (
          <span
            className={styles.health}
            role="meter"
            aria-label={`Vida de ${token.name}`}
            aria-valuemin={0}
            aria-valuemax={token.hpMax ?? 0}
            aria-valuenow={token.hpCurrent ?? 0}
          >
            <span
              className={cx(styles.healthFill, fraction < LOW_HEALTH_FRACTION && styles.healthLow)}
              style={{ width: `${fraction * 100}%` }}
            />
          </span>
        )}
      </div>
    </Html>
  );
}
