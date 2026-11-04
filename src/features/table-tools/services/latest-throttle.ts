export type LatestThrottle<T> = {
  /** Guarda o valor; manda já ou no fim do intervalo (sempre o mais recente). */
  push: (value: T) => void;
  /** Esquece o que estava para sair. */
  cancel: () => void;
};

/**
 * No máximo um envio a cada `intervalMs`, e o último valor nunca se perde: o canal do Supabase
 * tem limite de mensagens por segundo, e a régua de quem vê só precisa da ponta mais recente.
 */
export function createLatestThrottle<T>(
  send: (value: T) => void,
  intervalMs: number,
  now: () => number = Date.now,
): LatestThrottle<T> {
  let lastSentAt = Number.NEGATIVE_INFINITY;
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    timer = null;
    if (!pending) return;
    const { value } = pending;
    pending = null;
    lastSentAt = now();
    send(value);
  }

  return {
    push(value) {
      pending = { value };
      const wait = lastSentAt + intervalMs - now();
      if (wait <= 0) {
        if (timer) clearTimeout(timer);
        flush();
        return;
      }
      timer ??= setTimeout(flush, wait);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
