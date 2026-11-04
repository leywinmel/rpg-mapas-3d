import { useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Play, X } from 'lucide-react';
import { IconButton } from '@/components';
import { canEditInitiativeValue, tieNeighbors, type Viewer } from '@/domain';
import { cx } from '@/lib/cx';
import { useInitiativeStore } from '../hooks/initiative-store';
import { initiativeValueSchema } from '../schemas';
import type { InitiativeItem } from '../types';
import styles from './initiative.module.css';

type RowProps = {
  entry: InitiativeItem;
  viewer: Viewer;
  master: boolean;
};

/**
 * Campo do valor: grava ao sair do campo ou com Enter, e só se mudou. Valor inválido fica no
 * campo com a explicação embaixo (nada é enviado).
 */
function ValueField({ entry, editable }: { entry: InitiativeItem; editable: boolean }) {
  const [draft, setDraft] = useState(String(entry.value));
  const [error, setError] = useState<string | null>(null);
  const [lastValue, setLastValue] = useState(entry.value);
  // Valor novo vindo da mesa (outra pessoa mudou): o campo acompanha.
  if (entry.value !== lastValue) {
    setLastValue(entry.value);
    setDraft(String(entry.value));
    setError(null);
  }

  if (!editable) {
    return <span className={styles.value}>{entry.value}</span>;
  }

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    const parsed = initiativeValueSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Valor inválido.');
      return;
    }
    setError(null);
    if (parsed.data === entry.value) return;
    const saved = await useInitiativeStore
      .getState()
      .actions?.update(entry, { value: parsed.data });
    if (!saved) setDraft(String(entry.value));
  };

  return (
    <form className={styles.valueForm} onSubmit={(event) => void save(event)}>
      <input
        className={cx(styles.valueInput, error && styles.valueInvalid)}
        inputMode="numeric"
        aria-label={`Iniciativa de ${entry.label}`}
        aria-invalid={error ? true : undefined}
        title={error ?? undefined}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void save()}
      />
      {error && (
        <span className="visually-hidden" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}

function MasterTools({ entry }: { entry: InitiativeItem }) {
  const entries = useInitiativeStore((state) => state.board.entries);
  const actions = useInitiativeStore((state) => state.actions);
  const tie = tieNeighbors(entries, entry.id);
  return (
    <span className={styles.rowTools}>
      {tie.up && (
        <IconButton
          size="sm"
          label={`Passar ${entry.label} à frente no empate`}
          icon={<ChevronUp size={14} />}
          onClick={() => void actions?.moveTie(entry, 'up')}
        />
      )}
      {tie.down && (
        <IconButton
          size="sm"
          label={`Passar ${entry.label} para trás no empate`}
          icon={<ChevronDown size={14} />}
          onClick={() => void actions?.moveTie(entry, 'down')}
        />
      )}
      <IconButton
        size="sm"
        label={
          entry.hidden
            ? `Mostrar ${entry.label} aos jogadores`
            : `Esconder ${entry.label} dos jogadores`
        }
        icon={entry.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        active={entry.hidden}
        onClick={() => void actions?.update(entry, { hidden: !entry.hidden })}
      />
      <IconButton
        size="sm"
        label={`Tirar ${entry.label} da ordem`}
        icon={<X size={14} />}
        onClick={() => void actions?.remove(entry)}
      />
    </span>
  );
}

/** Uma linha da ordem: a vez, o valor, o nome (texto do React, nunca HTML [#53]) e as ações. */
export function InitiativeRow({ entry, viewer, master }: RowProps) {
  const mine = entry.ownerId !== null && entry.ownerId === viewer.userId;
  return (
    <li
      className={cx(
        styles.row,
        entry.isCurrent && styles.rowCurrent,
        entry.hidden && styles.rowHidden,
      )}
      aria-current={entry.isCurrent ? 'step' : undefined}
    >
      <span className={styles.turnMark} aria-hidden="true">
        {entry.isCurrent && <Play size={12} />}
      </span>
      <ValueField key={entry.id} entry={entry} editable={canEditInitiativeValue(viewer, entry)} />
      <span className={styles.rowText}>
        <span className={styles.rowName}>{entry.label}</span>
        <span className={styles.rowMeta}>
          {entry.isCurrent && 'Na vez · '}
          {mine ? 'Seu' : entry.tokenId ? 'Token' : 'Entrada livre'}
          {entry.hidden && ' · escondida'}
        </span>
      </span>
      {master && <MasterTools entry={entry} />}
    </li>
  );
}
