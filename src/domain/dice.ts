/**
 * Notação de dados no estilo do Owlbear Rodeo: "d20", "2d6+3", "1d8+1d6-1", "2d20kh1"
 * (vantagem: fica com o maior) e "2d20kl1" (desvantagem: fica com o menor).
 * O sorteio pode vir da física 3D (valores lidos dos dados parados) ou do sorteio
 * interno; o cálculo do total é o mesmo nos dois casos.
 */

/** Dados físicos disponíveis na bandeja (d4 a d100). */
export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
export type DieSides = (typeof DICE_SIDES)[number];

export const MAX_DICE_PER_ROLL = 50;
export const MAX_NOTATION_LENGTH = 100;
export const MAX_MODIFIER = 1000;

export type DiceGroup = {
  readonly count: number;
  readonly sides: DieSides;
  /** +1 soma o grupo, -1 subtrai. */
  readonly sign: 1 | -1;
  readonly keep?: { readonly mode: 'high' | 'low'; readonly count: number };
};

export type DiceExpression = {
  readonly groups: readonly DiceGroup[];
  readonly modifier: number;
  /** Notação reescrita de forma padrão, ex: "2d6 + 1d4 + 3". */
  readonly notation: string;
};

export type DieResult = {
  readonly sides: DieSides;
  readonly value: number;
  /** Falso quando o dado foi descartado por kh/kl. */
  readonly kept: boolean;
};

export type DiceOutcome = {
  readonly results: DieResult[];
  readonly modifier: number;
  readonly total: number;
};

export type ParseResult = { ok: true; expression: DiceExpression } | { ok: false; error: string };

const TERM = /^(\d*)d(\d+)(?:(kh|kl)(\d+))?$/;

function isDieSides(value: number): value is DieSides {
  return (DICE_SIDES as readonly number[]).includes(value);
}

export function parseDice(input: string): ParseResult {
  const raw = input.trim().toLowerCase().replace(/\s+/g, '');
  if (raw.length === 0) return { ok: false, error: 'Digite uma rolagem, por exemplo 1d20+3.' };
  if (raw.length > MAX_NOTATION_LENGTH) return { ok: false, error: 'Rolagem longa demais.' };

  const tokens = raw.match(/[+-]?[^+-]+/g);
  if (!tokens || tokens.join('') !== raw) return { ok: false, error: `Não entendi "${input}".` };

  const groups: DiceGroup[] = [];
  let modifier = 0;
  let totalDice = 0;

  for (const token of tokens) {
    const sign: 1 | -1 = token.startsWith('-') ? -1 : 1;
    const body = token.replace(/^[+-]/, '');

    if (/^\d+$/.test(body)) {
      modifier += sign * Number(body);
      continue;
    }

    const match = TERM.exec(body);
    if (!match) return { ok: false, error: `Não entendi "${body}". Use algo como 2d6.` };
    const [, countText, sidesText, keepMode, keepText] = match;
    const count = countText ? Number(countText) : 1;
    const sides = Number(sidesText);

    if (!isDieSides(sides)) {
      return {
        ok: false,
        error: `Não existe dado de ${sides} lados. Use d4, d6, d8, d10, d12, d20 ou d100.`,
      };
    }
    if (count < 1) return { ok: false, error: 'Role pelo menos um dado.' };

    let keep: DiceGroup['keep'];
    if (keepMode) {
      const keepCount = Number(keepText);
      if (keepCount < 1 || keepCount > count) {
        return { ok: false, error: `Em ${body}, só dá para ficar com 1 a ${count} dados.` };
      }
      keep = { mode: keepMode === 'kh' ? 'high' : 'low', count: keepCount };
    }

    totalDice += count;
    if (totalDice > MAX_DICE_PER_ROLL) {
      return { ok: false, error: `No máximo ${MAX_DICE_PER_ROLL} dados por rolagem.` };
    }
    groups.push(keep ? { count, sides, sign, keep } : { count, sides, sign });
  }

  if (groups.length === 0)
    return { ok: false, error: 'Inclua pelo menos um dado, por exemplo 1d20.' };
  if (Math.abs(modifier) > MAX_MODIFIER) return { ok: false, error: 'Bônus grande demais.' };

  return { ok: true, expression: { groups, modifier, notation: formatNotation(groups, modifier) } };
}

function formatNotation(groups: readonly DiceGroup[], modifier: number): string {
  const parts = groups.map((group, index) => {
    const keep = group.keep ? `${group.keep.mode === 'high' ? 'kh' : 'kl'}${group.keep.count}` : '';
    const term = `${group.count}d${group.sides}${keep}`;
    if (index === 0) return group.sign === -1 ? `-${term}` : term;
    return `${group.sign === -1 ? '-' : '+'} ${term}`;
  });
  if (modifier !== 0) parts.push(`${modifier < 0 ? '-' : '+'} ${Math.abs(modifier)}`);
  return parts.join(' ');
}

/** Quantos dados de cada tipo a bandeja precisa jogar, na ordem dos grupos. */
export function diceToThrow(expression: DiceExpression): DieSides[] {
  return expression.groups.flatMap((group) => Array<DieSides>(group.count).fill(group.sides));
}

/**
 * Calcula o total a partir dos valores de cada dado, na ordem de `diceToThrow`.
 * Usado com os valores da física 3D e com o sorteio interno.
 */
export function evaluateDice(expression: DiceExpression, values: readonly number[]): DiceOutcome {
  const expected = diceToThrow(expression);
  if (values.length !== expected.length) {
    throw new Error(`Esperava ${expected.length} dados, recebi ${values.length}.`);
  }

  const results: DieResult[] = [];
  let total = expression.modifier;
  let cursor = 0;

  for (const group of expression.groups) {
    const groupValues = values.slice(cursor, cursor + group.count);
    cursor += group.count;
    groupValues.forEach((value) => {
      if (!Number.isInteger(value) || value < 1 || value > group.sides) {
        throw new RangeError(`Valor ${value} impossível num d${group.sides}.`);
      }
    });

    const keptIndexes = pickKept(groupValues, group.keep);
    groupValues.forEach((value, index) => {
      const kept = keptIndexes.has(index);
      if (kept) total += group.sign * value;
      results.push({ sides: group.sides, value, kept });
    });
  }

  return { results, modifier: expression.modifier, total };
}

function pickKept(values: readonly number[], keep: DiceGroup['keep']): Set<number> {
  const indexes = values.map((_, index) => index);
  if (!keep) return new Set(indexes);
  const ordered = [...indexes].sort((a, b) => {
    const diff = (values[a] ?? 0) - (values[b] ?? 0);
    return keep.mode === 'high' ? -diff : diff;
  });
  return new Set(ordered.slice(0, keep.count));
}

/** Sorteio interno (sem física), com gerador injetável para testes. */
export function rollDice(
  expression: DiceExpression,
  random: () => number = Math.random,
): DiceOutcome {
  const values = diceToThrow(expression).map((sides) => 1 + Math.floor(random() * sides));
  return evaluateDice(expression, values);
}
