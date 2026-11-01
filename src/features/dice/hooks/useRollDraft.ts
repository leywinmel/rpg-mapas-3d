import { useCallback, useMemo, useState } from 'react';
import { parseDice, MAX_DICE_PER_ROLL, type DiceExpression, type DieSides } from '@/domain';
import {
  addDie,
  countBySides,
  countDice,
  EMPTY_EXPRESSION,
  removeDie,
  withModifier,
} from '../pool';

export type RollDraft = {
  /** O texto do campo, como a pessoa deixou. */
  notation: string;
  setNotation: (text: string) => void;
  /** A rolagem pronta para jogar; nula se o texto está vazio ou inválido. */
  expression: DiceExpression | null;
  /** O que está errado no texto, em português; nulo se está vazio ou certo. */
  error: string | null;
  /** O que os botões mostram (a parada atual, ou vazia se o texto não vale). */
  pool: DiceExpression;
  counts: Partial<Record<DieSides, number>>;
  full: boolean;
  add: (sides: DieSides) => void;
  remove: (groupIndex: number) => void;
  clear: () => void;
  setModifier: (modifier: number) => void;
};

function parseDraft(text: string) {
  return text.trim() === '' ? null : parseDice(text);
}

/**
 * O rascunho da rolagem. O campo de texto é a única fonte: os botões reescrevem o texto,
 * e o texto digitado vira a parada mostrada nos botões. Os botões partem do texto mais
 * recente (atualização funcional), então dois cliques seguidos nunca se atropelam.
 */
export function useRollDraft(): RollDraft {
  const [notation, setNotation] = useState('');

  const parsed = useMemo(() => parseDraft(notation), [notation]);
  const pool = parsed?.ok ? parsed.expression : EMPTY_EXPRESSION;
  const expression = parsed?.ok ? parsed.expression : null;
  const error = parsed && !parsed.ok ? parsed.error : null;

  /** Texto inválido não serve de base: o botão recomeça de uma parada vazia. */
  const change = useCallback((edit: (current: DiceExpression) => DiceExpression | null) => {
    setNotation((text) => {
      const current = parseDraft(text);
      const next = edit(current?.ok ? current.expression : EMPTY_EXPRESSION);
      return next ? next.notation : text;
    });
  }, []);

  const add = useCallback(
    (sides: DieSides) => change((current) => addDie(current, sides)),
    [change],
  );
  const remove = useCallback(
    (groupIndex: number) => change((current) => removeDie(current, groupIndex)),
    [change],
  );
  const clear = useCallback(() => setNotation(''), []);
  const setModifier = useCallback(
    (modifier: number) => change((current) => withModifier(current, modifier)),
    [change],
  );

  return {
    notation,
    setNotation,
    expression,
    error,
    pool,
    counts: countBySides(pool),
    full: countDice(pool) >= MAX_DICE_PER_ROLL,
    add,
    remove,
    clear,
    setModifier,
  };
}
