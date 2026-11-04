/** Eventos de broadcast do canal `initiative:<id da mesa>`. Sem conteúdo: cada um relê pelo RLS. */
export const INITIATIVE_EVENTS = {
  /** A ordem mudou (entrada, valor, vez, rodada): os outros releem. */
  changed: 'initiative-changed',
} as const;

/** Avisos em sequência (tokens, névoa, reconexão) viram uma releitura só dentro deste intervalo. */
export const INITIATIVE_RELOAD_DELAY_MS = 250;
