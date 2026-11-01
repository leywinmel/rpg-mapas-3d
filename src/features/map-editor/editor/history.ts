/**
 * Histórico de desfazer/refazer imutável e limitado. Guarda referências aos
 * documentos (que compartilham as partes não alteradas), então 100 passos num
 * mapa 100×100 custam poucos MB.
 */

export const HISTORY_LIMIT = 100;

export type History<T> = {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  readonly limit: number;
};

export function createHistory<T>(present: T, limit = HISTORY_LIMIT): History<T> {
  return { past: [], present, future: [], limit };
}

/** Novo estado: vira o presente e apaga o "refazer" (como em qualquer editor). */
export function pushHistory<T>(history: History<T>, next: T): History<T> {
  if (next === history.present) return history;
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: [],
  };
}

/** Troca o presente sem criar passo (ex: durante um traço do pincel). */
export function replacePresent<T>(history: History<T>, next: T): History<T> {
  if (next === history.present) return history;
  return { ...history, present: next };
}

/**
 * Fecha um traço: o estado de antes do traço entra no passado de uma vez, e o
 * traço inteiro se desfaz com um único Ctrl+Z.
 */
export function commitFrom<T>(history: History<T>, before: T): History<T> {
  if (before === history.present) return history;
  return {
    ...history,
    past: [...history.past, before].slice(-history.limit),
    future: [],
  };
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (next === undefined) return history;
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: rest,
  };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}
