import { Dices, EyeOff } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components';
import { cx } from '@/lib/cx';
import { formatRollMoment, formatRollTime } from '../format';
import type { HistoryState } from '../hooks/roll-history';
import { toDiceError } from '../services/dice-errors';
import type { DiceRoll } from '../types';
import { RollDiceList } from './RollDiceList';
import styles from './dice.module.css';

export type RollHistoryProps = {
  history: HistoryState;
  onRetry: () => void;
  nicknameOf: (userId: string | null) => string;
};

function HistoryEntry({ roll, who }: { roll: DiceRoll; who: string }) {
  return (
    <li className={cx(styles.entry, roll.hidden && styles.entrySecret)}>
      <div className={styles.entryHead}>
        <span className={styles.entryWho}>{who}</span>
        <span className={styles.entryNotation} title={roll.notation}>
          {roll.notation}
        </span>
        {roll.hidden && (
          <span className={styles.secretBadge}>
            <EyeOff size={11} aria-hidden="true" /> Escondida
          </span>
        )}
        <time
          className={styles.entryTime}
          dateTime={roll.createdAt}
          title={formatRollMoment(roll.createdAt)}
        >
          {formatRollTime(roll.createdAt)}
        </time>
      </div>
      <div className={styles.entryBody}>
        <RollDiceList roll={roll} />
        <span className={styles.entryTotal}>
          <span className="visually-hidden">Total </span>
          {roll.total}
        </span>
      </div>
    </li>
  );
}

/** As últimas rolagens da mesa, ao vivo. Escondidas só aparecem para quem pode vê-las. */
export function RollHistory({ history, onRetry, nicknameOf }: RollHistoryProps) {
  if (history.status === 'loading') return <LoadingState label="Carregando as rolagens…" />;

  if (history.status === 'error') {
    return (
      <ErrorState
        title="Histórico indisponível"
        description={toDiceError(history.error).message}
        onRetry={onRetry}
      />
    );
  }

  if (history.rolls.length === 0) {
    return (
      <EmptyState
        icon={<Dices size={22} />}
        title="Nenhuma rolagem ainda"
        description="As rolagens da mesa aparecem aqui, para todos."
      />
    );
  }

  return (
    <ol className={styles.history} aria-label="Histórico de rolagens" role="log">
      {history.rolls.map((roll) => (
        <HistoryEntry key={roll.id} roll={roll} who={nicknameOf(roll.rollerId)} />
      ))}
    </ol>
  );
}
