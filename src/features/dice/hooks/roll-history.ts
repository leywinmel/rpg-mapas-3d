import { HISTORY_LIMIT } from '../constants';
import type { DiceRoll } from '../types';

/**
 * O histórico junta duas fontes que chegam fora de ordem: a consulta ao banco e as
 * rolagens novas do Realtime. Juntar é sempre a união sem repetir (pelo id), da mais
 * nova para a mais antiga, limitada às últimas N.
 */
export function mergeRolls(
  current: readonly DiceRoll[],
  incoming: readonly DiceRoll[],
  limit: number = HISTORY_LIMIT,
): DiceRoll[] {
  const byId = new Map<string, DiceRoll>();
  for (const roll of current) byId.set(roll.id, roll);
  for (const roll of incoming) byId.set(roll.id, roll);
  return [...byId.values()]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

export type HistoryState = {
  status: 'loading' | 'ready' | 'error';
  rolls: DiceRoll[];
  error?: unknown;
};

export type HistoryAction =
  | { type: 'loaded'; rolls: readonly DiceRoll[] }
  | { type: 'failed'; error: unknown }
  | { type: 'inserted'; roll: DiceRoll }
  | { type: 'cleared' }
  | { type: 'retry' };

export const INITIAL_HISTORY: HistoryState = { status: 'loading', rolls: [] };

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'loaded':
      return { status: 'ready', rolls: mergeRolls(state.rolls, action.rolls) };
    case 'failed':
      // Uma recarga que falha não derruba a lista que já está na tela.
      if (state.status === 'ready') return state;
      return { status: 'error', rolls: state.rolls, error: action.error };
    case 'inserted':
      return { ...state, rolls: mergeRolls(state.rolls, [action.roll]) };
    case 'cleared':
      return { ...state, rolls: [] };
    case 'retry':
      return { status: 'loading', rolls: state.rolls };
  }
}
