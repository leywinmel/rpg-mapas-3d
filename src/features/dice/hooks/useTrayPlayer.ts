import { useCallback, useEffect, useReducer } from 'react';
import { QUEUE_PAUSE_MS } from '../constants';
import {
  INITIAL_PLAYER,
  playDurationMs,
  playerReducer,
  type CurrentPlay,
  type PlayItem,
} from './tray-player';

export type TrayPlayer = {
  current: CurrentPlay | null;
  enqueue: (item: PlayItem) => void;
};

/**
 * Fila de animações da bandeja. O fim de cada animação sai do relógio (a duração da
 * simulação é conhecida), não da tela: o placar não depende de o 3D estar aberto.
 */
export function useTrayPlayer(): TrayPlayer {
  const [state, dispatch] = useReducer(playerReducer, INITIAL_PLAYER);
  const { current, queue } = state;

  useEffect(() => {
    if (!current || current.phase !== 'playing') return;
    const remaining = current.startedAt + playDurationMs(current.sim) - performance.now();
    const timer = setTimeout(
      () => dispatch({ type: 'finished', id: current.id }),
      Math.max(0, remaining),
    );
    return () => clearTimeout(timer);
  }, [current]);

  const waiting = queue.length > 0;
  const done = current?.phase === 'done';
  useEffect(() => {
    if (!done || !waiting) return;
    const timer = setTimeout(
      () => dispatch({ type: 'advance', now: performance.now() }),
      QUEUE_PAUSE_MS,
    );
    return () => clearTimeout(timer);
  }, [done, waiting]);

  const enqueue = useCallback(
    (item: PlayItem) => dispatch({ type: 'enqueue', item, now: performance.now() }),
    [],
  );

  return { current, enqueue };
}
