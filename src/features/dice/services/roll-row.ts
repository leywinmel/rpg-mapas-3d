import { diceToThrow, evaluateDice, parseDice, type DieSides } from '@/domain';
import type { Database } from '@/lib/database.types';
import { logger } from '@/lib/logger';
import { storedResultsSchema, type StoredResults } from '../schemas';
import type { DiceRoll, RollDie } from '../types';

export type DiceRollRow = Database['public']['Tables']['dice_rolls']['Row'];

function everyDieKept(stored: StoredResults): RollDie[] {
  return stored.map((die) => ({ sides: die.sides as DieSides, value: die.value, kept: true }));
}

/**
 * O banco guarda só lados e valor de cada dado. Quais foram descartados por kh/kl sai
 * da própria notação, pela mesma regra do domínio, para os dois nunca divergirem.
 */
function markKept(notation: string, stored: StoredResults): RollDie[] {
  const parsed = parseDice(notation);
  if (!parsed.ok) return everyDieKept(stored);
  const sameDice = diceToThrow(parsed.expression).join() === stored.map((die) => die.sides).join();
  if (!sameDice) return everyDieKept(stored);
  try {
    return evaluateDice(
      parsed.expression,
      stored.map((die) => die.value),
    ).results.map((die) => ({ sides: die.sides, value: die.value, kept: die.kept }));
  } catch {
    return everyDieKept(stored);
  }
}

/** Linha do banco para o modelo da tela. Linha estragada vira rolagem sem dados, não erro. */
export function toDiceRoll(row: DiceRollRow): DiceRoll {
  const stored = storedResultsSchema.safeParse(row.results);
  if (!stored.success) {
    logger.warn('Rolagem com resultados inválidos no banco.', { feature: 'dice', rollId: row.id });
  }
  return {
    id: row.id,
    roomId: row.room_id,
    rollerId: row.roller_id,
    notation: row.notation,
    dice: stored.success ? markKept(row.notation, stored.data) : [],
    modifier: row.modifier,
    total: row.total,
    hidden: row.hidden,
    createdAt: row.created_at,
  };
}
