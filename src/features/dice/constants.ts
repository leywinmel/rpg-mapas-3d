/** Quantas rolagens o histórico da mesa mostra (as mais recentes). */
export const HISTORY_LIMIT = 30;

/** Depois da animação, espera a linha do banco chegar por este tempo antes de buscá-la direto. */
export const RESULT_WAIT_MS = 4000;

/** Pausa entre uma rolagem na bandeja e a próxima da fila, para dar tempo de ler o resultado. */
export const QUEUE_PAUSE_MS = 1400;
/** Rolagens esperando a vez na bandeja; passou disso, descarta a animação mais antiga. */
export const MAX_QUEUED_PLAYBACKS = 3;
/** Quantas rolagens já animadas a bandeja lembra, para não repetir uma mensagem duplicada. */
export const PLAYED_MEMORY = 50;

/** Transição curta que gira o dado até a face gravada no banco quando a simulação divergiu. */
export const CORRECTION_MS = 450;

/** Eventos de broadcast do canal `dice:<id da mesa>`. */
export const DICE_EVENTS = {
  /** Uma rolagem pública começou: `{ rollId, notation, spec }`. */
  throw: 'throw',
  /** O mestre limpou o histórico: os outros recarregam. */
  historyCleared: 'history-cleared',
} as const;
