import { STEPS_PER_SECOND } from '../physics/constants';
import type { SimulatedThrow } from '../physics/simulate';
import { MAX_QUEUED_PLAYBACKS, PLAYED_MEMORY } from '../constants';

/** Uma rolagem para a bandeja animar. */
export type PlayItem = {
  /** Id da linha em dice_rolls. */
  id: string;
  notation: string;
  sim: SimulatedThrow;
};

export type CurrentPlay = PlayItem & {
  /** `performance.now()` do instante em que os dados foram soltos. */
  startedAt: number;
  phase: 'playing' | 'done';
};

/**
 * A bandeja é uma só: mostra uma rolagem de cada vez, as outras esperam na fila. O estado
 * é puro (o relógio entra como parâmetro) para dar para testar sem WebGL nem timers.
 */
export type PlayerState = {
  current: CurrentPlay | null;
  queue: PlayItem[];
  /** Ids já animados (ou na fila), para uma mensagem repetida não rodar duas vezes. */
  seen: string[];
};

export type PlayerAction =
  | { type: 'enqueue'; item: PlayItem; now: number }
  | { type: 'finished'; id: string }
  | { type: 'advance'; now: number };

export const INITIAL_PLAYER: PlayerState = { current: null, queue: [], seen: [] };

function startPlay(item: PlayItem, now: number): CurrentPlay {
  return { ...item, startedAt: now, phase: 'playing' };
}

/** Quanto tempo a animação dura, em milissegundos. */
export function playDurationMs(sim: SimulatedThrow): number {
  return Math.max(0, ((sim.frameCount - 1) / STEPS_PER_SECOND) * 1000);
}

function remember(seen: readonly string[], id: string): string[] {
  return [...seen, id].slice(-PLAYED_MEMORY);
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'enqueue': {
      if (state.seen.includes(action.item.id)) return state;
      const seen = remember(state.seen, action.item.id);
      const idle = !state.current || (state.current.phase === 'done' && state.queue.length === 0);
      if (idle) return { current: startPlay(action.item, action.now), queue: [], seen };
      // Fila cheia: some a animação mais antiga (a rolagem continua no histórico).
      const queue = [...state.queue, action.item].slice(-MAX_QUEUED_PLAYBACKS);
      return { ...state, queue, seen };
    }
    case 'finished': {
      if (state.current?.id !== action.id) return state;
      return { ...state, current: { ...state.current, phase: 'done' } };
    }
    case 'advance': {
      if (state.current?.phase !== 'done') return state;
      const [next, ...rest] = state.queue;
      if (!next) return state;
      return { ...state, current: startPlay(next, action.now), queue: rest };
    }
  }
}
