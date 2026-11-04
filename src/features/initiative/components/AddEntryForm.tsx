import { useState, type FormEvent } from 'react';
import { Plus, UsersRound } from 'lucide-react';
import { Button, SegmentedControl, TextField } from '@/components';
import { MAX_INITIATIVE_LABEL_LENGTH } from '@/domain';
import { useTokensStore } from '@/features/tokens';
import { useInitiativeStore } from '../hooks/initiative-store';
import { initiativeLabelSchema, initiativeValueSchema } from '../schemas';
import type { NewInitiativeEntry } from '../types';
import styles from './initiative.module.css';

type Source = 'token' | 'free';

const SOURCES = [
  { value: 'token', label: 'Token do mapa' },
  { value: 'free', label: 'Entrada livre' },
] as const;

const DEFAULT_VALUE = '10';

type Errors = { label?: string; value?: string };

/** Tokens do mapa aberto que ainda não estão na ordem (o mesmo token entra uma vez só). */
function useTokensOutside() {
  const tokens = useTokensStore((state) => state.tokens);
  const entries = useInitiativeStore((state) => state.board.entries);
  const inside = new Set(entries.map((entry) => entry.tokenId));
  return tokens.filter((token) => !inside.has(token.id));
}

/**
 * Formulário do mestre: um token do mapa ou uma entrada livre (armadilha, reforços), com valor.
 * Token escondido entra escondido; a entrada livre pode entrar escondida também.
 */
export function AddEntryForm() {
  const outside = useTokensOutside();
  const [source, setSource] = useState<Source>('token');
  const [tokenId, setTokenId] = useState('');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState(DEFAULT_VALUE);
  const [hidden, setHidden] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const chosen = outside.find((token) => token.id === tokenId) ?? outside[0] ?? null;

  const add = async (entries: NewInitiativeEntry[]) => {
    const actions = useInitiativeStore.getState().actions;
    if (!actions) return false;
    setBusy(true);
    const saved = await actions.add(entries);
    setBusy(false);
    return saved;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedValue = initiativeValueSchema.safeParse(value);
    const parsedLabel =
      source === 'free'
        ? initiativeLabelSchema.safeParse(label)
        : initiativeLabelSchema.safeParse(chosen?.name ?? '');
    const next: Errors = {};
    if (!parsedValue.success) next.value = parsedValue.error.issues[0]?.message;
    if (!parsedLabel.success) {
      next.label = source === 'free' ? parsedLabel.error.issues[0]?.message : 'Escolha um token.';
    }
    setErrors(next);
    if (!parsedValue.success || !parsedLabel.success) return;
    const entry: NewInitiativeEntry =
      source === 'token' && chosen
        ? {
            tokenId: chosen.id,
            label: parsedLabel.data,
            value: parsedValue.data,
            hidden: chosen.hidden,
          }
        : { tokenId: null, label: parsedLabel.data, value: parsedValue.data, hidden };
    if (!(await add([entry]))) return;
    setLabel('');
    setTokenId('');
  };

  const addAll = () =>
    void add(
      outside.map((token) => ({
        tokenId: token.id,
        label: token.name,
        value: 0,
        hidden: token.hidden,
      })),
    );

  return (
    <form className={styles.addForm} onSubmit={(event) => void submit(event)} noValidate>
      <SegmentedControl
        label="O que entra na ordem"
        options={SOURCES}
        value={source}
        onChange={(next) => {
          setSource(next);
          setErrors({});
        }}
      />
      <div className={styles.addFields}>
        {source === 'token' ? (
          <label className={styles.selectField}>
            <span className={styles.fieldLabel}>Token</span>
            <select
              className={styles.select}
              value={chosen?.id ?? ''}
              onChange={(event) => setTokenId(event.target.value)}
              disabled={outside.length === 0}
              aria-invalid={errors.label ? true : undefined}
            >
              {outside.length === 0 && <option value="">Todos já estão na ordem</option>}
              {outside.map((token) => (
                <option key={token.id} value={token.id}>
                  {token.hidden ? `${token.name} (escondido)` : token.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <TextField
            label="Nome"
            value={label}
            maxLength={MAX_INITIATIVE_LABEL_LENGTH}
            placeholder="Ex: Armadilha de fogo"
            onChange={(event) => setLabel(event.target.value)}
            error={errors.label}
          />
        )}
        <TextField
          label="Valor"
          className={styles.valueField}
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={errors.value}
        />
      </div>
      {source === 'free' && (
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={hidden}
            onChange={(event) => setHidden(event.target.checked)}
          />
          Escondida dos jogadores
        </label>
      )}
      <div className={styles.addActions}>
        {source === 'token' && outside.length > 1 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            icon={<UsersRound size={16} />}
            onClick={addAll}
            disabled={busy}
          >
            Todos ({outside.length})
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          icon={<Plus size={16} />}
          loading={busy}
          disabled={source === 'token' && outside.length === 0}
        >
          Adicionar
        </Button>
      </div>
    </form>
  );
}
