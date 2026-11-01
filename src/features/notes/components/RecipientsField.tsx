import { useId } from 'react';
import { Avatar } from '@/components';
import type { RoomMember } from '@/features/rooms';
import { cx } from '@/lib/cx';
import type { NoteRecipients } from '../types';
import styles from './notes.module.css';

export type RecipientsFieldProps = {
  value: NoteRecipients;
  /** Quem pode ser escolhido: os jogadores da mesa. */
  players: readonly RoomMember[];
  error?: string;
  disabled?: boolean;
  onChange: (value: NoteRecipients) => void;
};

/** "Para quem?": a mesa toda ou só os jogadores marcados na lista. */
export function RecipientsField({
  value,
  players,
  error,
  disabled,
  onChange,
}: RecipientsFieldProps) {
  const groupName = useId();
  const noPlayers = players.length === 0;
  const selected = value.mode === 'chosen' ? value.userIds : [];

  function toggle(userId: string) {
    const next = selected.includes(userId)
      ? selected.filter((id) => id !== userId)
      : [...selected, userId];
    onChange({ mode: 'chosen', userIds: next });
  }

  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.legend}>Para quem?</legend>
      <label className={styles.choice}>
        <input
          type="radio"
          name={groupName}
          checked={value.mode === 'all'}
          onChange={() => onChange({ mode: 'all' })}
        />
        Mesa toda
      </label>
      <label className={cx(styles.choice, noPlayers && styles.choiceDisabled)}>
        <input
          type="radio"
          name={groupName}
          checked={value.mode === 'chosen'}
          disabled={noPlayers}
          onChange={() => onChange({ mode: 'chosen', userIds: [] })}
        />
        Jogadores escolhidos
      </label>
      {noPlayers && (
        <span className={styles.hint}>
          Ainda não há jogadores na mesa. Mande o link de convite para escolher quem recebe.
        </span>
      )}
      {value.mode === 'chosen' && (
        <ul className={styles.recipientList} aria-label="Jogadores da mesa">
          {players.map((player) => (
            <li key={player.userId}>
              <label className={styles.recipient}>
                <input
                  type="checkbox"
                  checked={selected.includes(player.userId)}
                  onChange={() => toggle(player.userId)}
                />
                {/* O apelido já nomeia a caixa; o avatar é só enfeite para o leitor de tela. */}
                <span aria-hidden="true">
                  <Avatar nickname={player.nickname} seed={player.userId} size="sm" />
                </span>
                {player.nickname}
              </label>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <span role="alert" className={styles.fieldError}>
          {error}
        </span>
      )}
    </fieldset>
  );
}
