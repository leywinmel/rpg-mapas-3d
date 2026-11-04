import type { DragMessage } from '../schemas';

export type DragThrottle = {
  /** Guarda a posição; manda já ou no fim do intervalo (sempre a mais recente). */
  push: (message: DragMessage) => void;
  /** Esquece o que estava para sair (o token foi solto ou sumiu da vista). */
  cancel: () => void;
};

/**
 * No arraste, uma mensagem por casa nova e no máximo uma a cada `intervalMs`: o canal do
 * Supabase tem limite de mensagens por segundo, e quem vê suaviza o caminho entre as casas.
 */
export function createDragThrottle(
  send: (message: DragMessage) => void,
  intervalMs: number,
  now: () => number = Date.now,
): DragThrottle {
  let lastSentAt = Number.NEGATIVE_INFINITY;
  let lastKey = '';
  let pending: DragMessage | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    timer = null;
    if (!pending) return;
    const message = pending;
    pending = null;
    lastSentAt = now();
    send(message);
  }

  return {
    push(message) {
      const key = `${message.tokenId}:${message.x}:${message.z}`;
      if (key === lastKey) return;
      lastKey = key;
      pending = message;
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
      lastKey = '';
    },
  };
}
