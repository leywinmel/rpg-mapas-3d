import type { Note } from '../types';

function timeOf(iso: string): number {
  return Date.parse(iso);
}

/** O momento da anotação mais nova da lista; nulo se a lista está vazia. */
export function newestCreatedAt(notes: readonly Note[]): string | null {
  let newest: string | null = null;
  for (const note of notes) {
    if (newest === null || timeOf(note.createdAt) > timeOf(newest)) newest = note.createdAt;
  }
  return newest;
}

/** O mais recente entre dois momentos; nulo conta como "nunca". */
export function laterOf(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return timeOf(b) > timeOf(a) ? b : a;
}

/** Não lida = de outra pessoa e mais nova que a última vista. Sem última vista, tudo é novo. */
export function isUnread(note: Note, viewerId: string, lastSeenAt: string | null): boolean {
  if (note.authorId === viewerId) return false;
  return lastSeenAt === null || timeOf(note.createdAt) > timeOf(lastSeenAt);
}

export function countUnread(
  notes: readonly Note[],
  viewerId: string,
  lastSeenAt: string | null,
): number {
  return notes.filter((note) => isUnread(note, viewerId, lastSeenAt)).length;
}

/**
 * O que chegou entre uma carga e a seguinte: ids novos, de outra pessoa e mais novos que
 * tudo o que já se conhecia. A última condição deixa de fora as anotações antigas que só
 * entraram na janela (ao pedir mais antigas ou quando uma mais nova foi apagada).
 * `previous` nulo é a carga inicial: nada "chegou", tudo já estava lá.
 */
export function findArrivals(
  previous: readonly Note[] | null,
  next: readonly Note[],
  viewerId: string,
): Note[] {
  if (previous === null) return [];
  const known = new Set(previous.map((note) => note.id));
  const newestKnown = newestCreatedAt(previous);
  return next.filter(
    (note) =>
      !known.has(note.id) &&
      note.authorId !== viewerId &&
      (newestKnown === null || timeOf(note.createdAt) > timeOf(newestKnown)),
  );
}
