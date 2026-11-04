export type RateLimit = { readonly count: number; readonly windowMs: number };

export type RateLimiter = {
  /** Cabe mais um agora? Se couber, já conta este. */
  tryTake: (key: string) => boolean;
};

/**
 * Janela deslizante por chave (uma pessoa): no máximo `count` vezes em `windowMs`. A chave deixa o
 * mesmo limitador valer para quem envia (a própria pessoa) e para quem recebe (cada remetente).
 */
export function createRateLimiter(limit: RateLimit, now: () => number = Date.now): RateLimiter {
  const history = new Map<string, number[]>();
  return {
    tryTake(key) {
      const at = now();
      const recent = (history.get(key) ?? []).filter((time) => at - time < limit.windowMs);
      if (recent.length >= limit.count) {
        history.set(key, recent);
        return false;
      }
      history.set(key, [...recent, at]);
      return true;
    },
  };
}
