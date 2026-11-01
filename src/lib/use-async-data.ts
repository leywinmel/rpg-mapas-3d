import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncData<T> =
  { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T };

type Settled<T> = Exclude<AsyncData<T>, { status: 'loading' }>;

/**
 * Carrega um dado ligado a uma chave (ex: id da mesa). Chave nula = ainda não dá para
 * carregar. Ao recarregar a mesma chave, o dado anterior continua na tela até o novo
 * chegar, para listas vivas (presença, membros) não piscarem.
 */
export function useAsyncData<T>(
  key: string | null,
  load: () => Promise<T>,
): AsyncData<T> & { reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; value: Settled<T> } | null>(null);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (key === null) return;
    let active = true;
    loadRef.current().then(
      (data) => active && setResult({ key, value: { status: 'ready', data } }),
      (error: unknown) => active && setResult({ key, value: { status: 'error', error } }),
    );
    return () => {
      active = false;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  if (key === null || result?.key !== key) return { status: 'loading', reload };
  return { ...result.value, reload };
}
