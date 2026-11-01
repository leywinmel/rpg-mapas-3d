import { cx } from '@/lib/cx';
import { signedModifier } from '../format';
import type { DiceRoll } from '../types';
import styles from './dice.module.css';

/** Acima disto os dados viram só números numa lista rolável: 50 dados não cabem em fichas grandes. */
const COMPACT_DICE_COUNT = 12;

/**
 * Cada dado que saiu e o bônus. Os descartados por kh/kl ficam apagados e riscados, e o
 * leitor de tela ouve "descartado". Só texto, nunca HTML.
 */
export function RollDiceList({ roll }: { roll: DiceRoll }) {
  const bonus = signedModifier(roll.modifier);
  const compact = roll.dice.length > COMPACT_DICE_COUNT;
  return (
    <ul className={cx(styles.dice, compact && styles.diceCompact)} aria-label="Dados da rolagem">
      {roll.dice.map((die, index) => (
        <li
          key={index}
          className={cx(styles.die, !die.kept && styles.dieDiscarded)}
          title={`d${die.sides}`}
        >
          <span className={styles.dieSides} aria-hidden="true">
            d{die.sides}
          </span>
          <span className={styles.dieValue}>{die.value}</span>
          {!die.kept && <span className="visually-hidden">descartado</span>}
        </li>
      ))}
      {bonus && (
        <li className={styles.modifier}>
          <span className="visually-hidden">bônus </span>
          {bonus}
        </li>
      )}
    </ul>
  );
}
