import { EyeOff } from 'lucide-react';
import { Spinner } from '@/components';
import { cx } from '@/lib/cx';
import { describeRoll } from '../format';
import type { CurrentPlay } from '../hooks/tray-player';
import type { DiceRoll } from '../types';
import { RollDiceList } from './RollDiceList';
import styles from './dice.module.css';

export type RollResultProps = {
  play: CurrentPlay | null;
  /** A linha do banco da rolagem na bandeja, quando já chegou. */
  roll: DiceRoll | null;
  who: string;
};

/**
 * O resultado em destaque. O que aparece é sempre o da linha do banco, mesmo que a
 * animação tenha terminado em outra face. Fica sob a bandeja (e não sobre ela) para
 * nunca esconder os dados. O leitor de tela ouve a frase completa quando termina.
 */
export function RollResult({ play, roll, who }: RollResultProps) {
  if (!play) {
    return (
      <div className={styles.result} role="status">
        <p className={styles.resultHint}>
          Escolha os dados e role. Todos na mesa veem o resultado.
        </p>
      </div>
    );
  }

  if (play.phase === 'playing') {
    return (
      <div className={styles.result} role="status">
        <span className={styles.resultWaiting}>
          <Spinner size="sm" label="Rolando" />
        </span>
        <div className={styles.resultDetails}>
          <p className={styles.resultTitle}>{roll ? who : 'Alguém'} está rolando</p>
          <p>{play.notation}</p>
        </div>
      </div>
    );
  }

  if (!roll) {
    return (
      <div className={styles.result} role="status">
        <span className={styles.resultWaiting}>
          <Spinner size="sm" label="Conferindo o resultado" />
        </span>
        <p className={styles.resultHint}>Conferindo o resultado…</p>
      </div>
    );
  }

  return (
    <div className={cx(styles.result, roll.hidden && styles.resultSecret)} role="status">
      <p className="visually-hidden">{describeRoll(roll, who)}</p>
      <p className={styles.resultTotal} aria-hidden="true">
        {roll.total}
      </p>
      <div className={styles.resultDetails} aria-hidden="true">
        <p className={styles.resultTitle}>
          {who} · {roll.notation}
        </p>
        <RollDiceList roll={roll} />
        {roll.hidden && (
          <p className={styles.secretBadge}>
            <EyeOff size={12} aria-hidden="true" /> Escondida: só você vê
          </p>
        )}
      </div>
    </div>
  );
}
