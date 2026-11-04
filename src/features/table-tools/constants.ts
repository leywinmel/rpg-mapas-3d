/** Ferramentas da mesa: régua e ping. Tudo efêmero: nada aqui vai para o banco. */

/** Eventos de broadcast do canal `table:<id da mesa>`. Levam só casas e ids, nada que o RLS esconda. */
export const TABLE_EVENTS = {
  /** Régua compartilhada: `{ userId, mapId, from, to }`. */
  ruler: 'ruler',
  /** Quem compartilhava a régua parou: `{ userId }`. */
  rulerCleared: 'ruler-cleared',
  /** Marcador no mapa: `{ id, userId, mapId, cell }`. */
  ping: 'ping',
} as const;

/** No arraste da régua compartilhada, no máximo um aviso a cada tanto (limite do Realtime). */
export const RULER_BROADCAST_INTERVAL_MS = 80;

/**
 * Limite de pings: quem clica sem parar não enche a mesa de marcadores nem estoura o limite de
 * mensagens do canal. Vale ao enviar e, por pessoa, ao receber (um cliente alterado não fura).
 */
export const PING_LIMIT = { count: 3, windowMs: 3000 } as const;

/** Quanto tempo o marcador fica na tela. */
export const PING_LIFETIME_MS = 2600;

/** Pings guardados ao mesmo tempo (os mais velhos saem antes da hora). */
export const MAX_VISIBLE_PINGS = 12;
