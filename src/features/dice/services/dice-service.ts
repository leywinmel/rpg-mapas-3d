import type { DiceOutcome } from '@/domain';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { HISTORY_LIMIT } from '../constants';
import { newRollSchema } from '../schemas';
import type { DiceRoll } from '../types';
import { toDiceError } from './dice-errors';
import { toDiceRoll } from './roll-row';

const ROLL_COLUMNS =
  'id, room_id, roller_id, notation, results, modifier, total, hidden, created_at';

export type NewRoll = {
  roomId: string;
  rollerId: string;
  /** Notação padronizada (`expression.notation`). */
  notation: string;
  outcome: DiceOutcome;
  hidden: boolean;
};

/** Rolagens da mesa no Supabase, atrás de uma interface mockável [#20][#45]. */
export function createDiceService(client: AppSupabaseClient) {
  return {
    /** As rolagens mais recentes que a pessoa pode ver (o RLS esconde as escondidas dos outros). */
    async listRecent(roomId: string, limit: number = HISTORY_LIMIT): Promise<DiceRoll[]> {
      const { data, error } = await client
        .from('dice_rolls')
        .select(ROLL_COLUMNS)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw toDiceError(error);
      return data.map(toDiceRoll);
    },

    /** Uma rolagem pelo id; nula se não existe ou se o RLS não deixa ver. */
    async getRoll(id: string): Promise<DiceRoll | null> {
      const { data, error } = await client
        .from('dice_rolls')
        .select(ROLL_COLUMNS)
        .eq('id', id)
        .maybeSingle();
      if (error) throw toDiceError(error);
      return data ? toDiceRoll(data) : null;
    },

    /** Grava a rolagem já calculada e devolve a linha criada (com o id que o banco deu). */
    async insertRoll(roll: NewRoll): Promise<DiceRoll> {
      const input = newRollSchema.safeParse({
        roomId: roll.roomId,
        rollerId: roll.rollerId,
        notation: roll.notation,
        results: roll.outcome.results.map(({ sides, value }) => ({ sides, value })),
        modifier: roll.outcome.modifier,
        total: roll.outcome.total,
        hidden: roll.hidden,
      });
      if (!input.success) throw toDiceError(input.error);

      const { roomId, rollerId, notation, results, modifier, total, hidden } = input.data;
      const { data, error } = await client
        .from('dice_rolls')
        .insert({
          room_id: roomId,
          roller_id: rollerId,
          notation,
          results,
          modifier,
          total,
          hidden,
        })
        .select(ROLL_COLUMNS)
        .single();
      if (error) throw toDiceError(error);
      return toDiceRoll(data);
    },

    /** Apaga todo o histórico da mesa (só o mestre; para os outros o RLS não apaga nada). */
    async clearHistory(roomId: string): Promise<void> {
      const { error } = await client.from('dice_rolls').delete().eq('room_id', roomId);
      if (error) throw toDiceError(error);
    },
  };
}

export type DiceService = ReturnType<typeof createDiceService>;

let defaultService: DiceService | null = null;

export function getDiceService(): DiceService {
  defaultService ??= createDiceService(getSupabase());
  return defaultService;
}
