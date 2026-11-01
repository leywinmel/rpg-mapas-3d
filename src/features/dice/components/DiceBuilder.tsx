import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Dices, Minus, Trash2 } from 'lucide-react';
import { Button, IconButton, TextField } from '@/components';
import { DICE_SIDES, MAX_MODIFIER, type DiceExpression } from '@/domain';
import type { EngineStatus } from '../hooks/useRapierStatus';
import type { RollDraft } from '../hooks/useRollDraft';
import { describeGroup } from '../pool';
import { HiddenSwitch } from './HiddenSwitch';
import styles from './dice.module.css';

export type DiceBuilderProps = {
  draft: RollDraft;
  /** O mestre pode rolar escondido; a chave só aparece para ele. */
  canHide: boolean;
  hidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
  /** Rolagem sendo gravada: o botão fica ocupado. */
  rolling: boolean;
  /** O motor de física: o botão espera enquanto baixa e fica parado se falhou. */
  engine: EngineStatus;
  onRoll: (expression: DiceExpression) => void;
};

const NOTATION_HINT = 'Ex.: 1d20+5, 4d6, 2d20kh1 (vantagem)';
const WHOLE_NUMBER = /^[+-]?\d+$/;

/**
 * O bônus enquanto a pessoa digita: "-" sozinho ainda não é número, então o texto fica como
 * está até virar um valor. Ao sair do campo, mostra o bônus de verdade da rolagem.
 */
function ModifierField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [typed, setTyped] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    setTyped(text);
    if (WHOLE_NUMBER.test(text.trim())) onChange(Number(text));
    else if (text.trim() === '') onChange(0);
  }

  return (
    <TextField
      label="Bônus"
      inputMode="numeric"
      autoComplete="off"
      maxLength={String(MAX_MODIFIER).length + 1}
      value={typed ?? String(value)}
      onChange={handleChange}
      onBlur={() => setTyped(null)}
    />
  );
}

/**
 * Monta a rolagem: os botões somam dados, os chips tiram, o bônus sobe e desce, e o campo
 * de texto aceita a notação inteira. Botões e texto mexem na mesma rolagem.
 */
export function DiceBuilder({
  draft,
  canHide,
  hidden,
  onHiddenChange,
  rolling,
  engine,
  onRoll,
}: DiceBuilderProps) {
  const { expression, pool } = draft;
  const rollable = expression !== null && expression.groups.length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expression || !rollable || rolling || engine !== 'ready') return;
    onRoll(expression);
  }

  return (
    <form className={styles.builder} onSubmit={handleSubmit} noValidate>
      <div className={styles.dieButtons} role="group" aria-label="Dados">
        {DICE_SIDES.map((sides) => {
          const count = draft.counts[sides] ?? 0;
          return (
            <button
              key={sides}
              type="button"
              className={styles.dieButton}
              aria-label={
                count > 0 ? `Adicionar d${sides} (${count} na rolagem)` : `Adicionar d${sides}`
              }
              disabled={draft.full}
              onClick={() => draft.add(sides)}
            >
              d{sides}
              {count > 0 && (
                <span className={styles.dieCount} aria-hidden="true">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ul className={styles.pool} aria-label="Dados escolhidos">
        {pool.groups.length === 0 && (
          <li className={styles.poolHint}>Clique nos dados para montar a rolagem.</li>
        )}
        {pool.groups.map((group, index) => (
          <li key={`${describeGroup(group)}-${index}`} className={styles.poolChip}>
            {describeGroup(group)}
            <IconButton
              size="sm"
              label={`Tirar um dado de ${describeGroup(group)}`}
              icon={<Minus size={14} />}
              onClick={() => draft.remove(index)}
            />
          </li>
        ))}
        {pool.groups.length > 0 && (
          <li className={styles.poolActions}>
            <IconButton
              size="sm"
              label="Limpar a rolagem"
              icon={<Trash2 size={14} />}
              onClick={draft.clear}
            />
          </li>
        )}
      </ul>

      <div className={styles.fields}>
        <ModifierField value={pool.modifier} onChange={draft.setModifier} />
        <TextField
          label="Rolagem"
          value={draft.notation}
          placeholder="2d20kh1+3"
          autoComplete="off"
          spellCheck={false}
          error={draft.error ?? undefined}
          hint={draft.error ? undefined : NOTATION_HINT}
          onChange={(event) => draft.setNotation(event.target.value)}
        />
      </div>

      <div className={styles.rollRow}>
        {canHide ? <HiddenSwitch checked={hidden} onChange={onHiddenChange} /> : <span />}
        <Button
          type="submit"
          icon={<Dices size={16} />}
          loading={rolling || engine === 'loading'}
          disabled={!rollable || engine === 'error'}
        >
          Rolar
        </Button>
      </div>
    </form>
  );
}
