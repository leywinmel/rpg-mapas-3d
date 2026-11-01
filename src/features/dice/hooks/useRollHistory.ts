import { useCallback, useEffect, useReducer, useRef } from 'react';
import { reportDiceFailure } from '../services/dice-errors';
import type { DiceService } from '../services/dice-service';
import type { DiceRoll } from '../types';
import { historyReducer, INITIAL_HISTORY, type HistoryState } from './roll-history';

export type RollHistory = {
  state: HistoryState;
  /** Uma rolagem nova (do Realtime ou da própria pessoa). */
  insert: (roll: DiceRoll) => void;
  /** Esvazia a lista na hora e descarta consultas que ainda estavam a caminho. */
  clearLocal: () => void;
  /** Consulta o banco de novo, sem piscar a lista. */
  reload: () => Promise<void>;
  retry: () => void;
};

/** O histórico vivo da mesa: consulta inicial + rolagens novas, sempre sem repetir. */
export function useRollHistory(roomId: string, service: DiceService): RollHistory {
  const [state, dispatch] = useReducer(historyReducer, INITIAL_HISTORY);
  // Cada limpeza muda a geração: uma resposta que saiu antes dela está velha e é descartada.
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const startedIn = generation.current;
    try {
      const rolls = await service.listRecent(roomId);
      if (startedIn !== generation.current) return;
      dispatch({ type: 'loaded', rolls });
    } catch (error) {
      if (startedIn !== generation.current) return;
      reportDiceFailure(error, { action: 'list-history', toast: false });
      dispatch({ type: 'failed', error });
    }
  }, [roomId, service]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const insert = useCallback((roll: DiceRoll) => dispatch({ type: 'inserted', roll }), []);

  const clearLocal = useCallback(() => {
    generation.current += 1;
    dispatch({ type: 'cleared' });
  }, []);

  const retry = useCallback(() => {
    dispatch({ type: 'retry' });
    void reload();
  }, [reload]);

  return { state, insert, clearLocal, reload, retry };
}
