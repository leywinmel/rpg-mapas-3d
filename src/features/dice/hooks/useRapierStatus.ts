import { useCallback, useEffect, useState } from 'react';
import { loadRapier } from '../physics/rapier';
import { reportDiceFailure } from '../services/dice-errors';

export type EngineStatus = 'loading' | 'ready' | 'error';

/**
 * Prepara o motor de física assim que a bandeja abre, para o primeiro "Rolar" não esperar
 * o download. A rolagem em si pede o motor por conta própria (`loadRapier` é compartilhado).
 */
export function useRapierStatus(): { status: EngineStatus; retry: () => void } {
  const [status, setStatus] = useState<EngineStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadRapier().then(
      () => active && setStatus('ready'),
      (error: unknown) => {
        if (!active) return;
        reportDiceFailure(error, {
          action: 'load-physics',
          toast: false,
        });
        setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((count) => count + 1);
  }, []);

  return { status, retry };
}
