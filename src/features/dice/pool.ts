/**
 * A "parada" de dados montada pelos botões (clique soma um dado, o "−" tira, o bônus
 * sobe e desce). Tudo vira a mesma notação que o campo de texto aceita, então botões e
 * texto são duas formas de mexer na mesma rolagem.
 */
import {
  formatNotation,
  MAX_DICE_PER_ROLL,
  MAX_MODIFIER,
  type DiceExpression,
  type DiceGroup,
  type DieSides,
} from '@/domain';

export const EMPTY_EXPRESSION: DiceExpression = { groups: [], modifier: 0, notation: '' };

function rebuild(groups: readonly DiceGroup[], modifier: number): DiceExpression {
  return { groups, modifier, notation: formatNotation(groups, modifier) };
}

export function countDice(expression: DiceExpression): number {
  return expression.groups.reduce((total, group) => total + group.count, 0);
}

/** Quantos dados de cada tipo há na parada (para o contador nos botões). */
export function countBySides(expression: DiceExpression): Partial<Record<DieSides, number>> {
  const counts: Partial<Record<DieSides, number>> = {};
  for (const group of expression.groups) {
    counts[group.sides] = (counts[group.sides] ?? 0) + group.count;
  }
  return counts;
}

/** Soma um dado ao primeiro grupo igual (sem sinal negativo); nulo se a rolagem já está cheia. */
export function addDie(expression: DiceExpression, sides: DieSides): DiceExpression | null {
  if (countDice(expression) >= MAX_DICE_PER_ROLL) return null;
  const target = expression.groups.findIndex((group) => group.sides === sides && group.sign === 1);
  const groups =
    target === -1
      ? [...expression.groups, { count: 1, sides, sign: 1 } satisfies DiceGroup]
      : expression.groups.map((group, index) =>
          index === target ? { ...group, count: group.count + 1 } : group,
        );
  return rebuild(groups, expression.modifier);
}

/** Tira um dado do grupo. O último dado do grupo tira o grupo inteiro. */
export function removeDie(expression: DiceExpression, groupIndex: number): DiceExpression {
  const groups = expression.groups.flatMap((group, index): DiceGroup[] => {
    if (index !== groupIndex) return [group];
    const count = group.count - 1;
    if (count < 1) return [];
    // kh/kl não pode guardar mais dados do que restaram.
    const keep = group.keep && { ...group.keep, count: Math.min(group.keep.count, count) };
    return [keep ? { ...group, count, keep } : { ...group, count }];
  });
  return rebuild(groups, expression.modifier);
}

/** Troca o bônus, sempre inteiro e dentro do limite aceito. */
export function withModifier(expression: DiceExpression, modifier: number): DiceExpression {
  const whole = Number.isFinite(modifier) ? Math.trunc(modifier) : 0;
  const clamped = Math.max(-MAX_MODIFIER, Math.min(MAX_MODIFIER, whole));
  return rebuild(expression.groups, clamped);
}

/** Texto curto de um grupo para o botão de remover, ex: "2d6", "−1d4" ou "2d20kh1". */
export function describeGroup(group: DiceGroup): string {
  const keep = group.keep ? `${group.keep.mode === 'high' ? 'kh' : 'kl'}${group.keep.count}` : '';
  return `${group.sign === -1 ? '−' : ''}${group.count}d${group.sides}${keep}`;
}
