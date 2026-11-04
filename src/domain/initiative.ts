/** Ordem de iniciativa: quem age primeiro no combate e de quem é a vez. */

/** Faixas aceitas pelo banco (checks de initiative_entries): mudar um lado pede mudar o outro. */
export const INITIATIVE_VALUE_MIN = -99;
export const INITIATIVE_VALUE_MAX = 999;
export const MAX_INITIATIVE_LABEL_LENGTH = 60;

export type InitiativeEntry = {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  /** Desempate manual definido pelo mestre (menor vem antes). */
  readonly position: number;
  readonly isCurrent: boolean;
};

/** De quem é a vez (nula = combate parado) e em que rodada (0 = ainda não começou). */
export type InitiativeTurn = { readonly currentId: string | null; readonly round: number };

export type TieMove = 'up' | 'down';

/** Maior iniciativa primeiro; empate decidido pela posição e, por fim, pelo nome. */
export function sortInitiative<T extends InitiativeEntry>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      b.value - a.value || a.position - b.position || a.label.localeCompare(b.label, 'pt-BR'),
  );
}

/** Passa a vez para o próximo da ordem; depois do último, volta ao primeiro. */
export function advanceTurn<T extends InitiativeEntry>(entries: readonly T[]): T[] {
  const ordered = sortInitiative(entries);
  if (ordered.length === 0) return [];
  const currentIndex = ordered.findIndex((entry) => entry.isCurrent);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % ordered.length;
  return ordered.map((entry, index) => ({ ...entry, isCurrent: index === nextIndex }));
}

/** Rodada atual começa quando a vez volta ao primeiro da lista. */
export function isNewRound(
  before: readonly InitiativeEntry[],
  after: readonly InitiativeEntry[],
): boolean {
  const first = sortInitiative(after)[0];
  const hadCurrent = before.some((entry) => entry.isCurrent);
  return hadCurrent && first !== undefined && first.isCurrent;
}

/**
 * Próxima vez e rodada. Sem ninguém na vez, o combate começa no primeiro (rodada 1, ou a seguinte
 * se já havia rodada); passar do último volta ao primeiro numa rodada nova.
 */
export function nextTurn(entries: readonly InitiativeEntry[], round: number): InitiativeTurn {
  if (entries.length === 0) return { currentId: null, round: 0 };
  const after = advanceTurn(entries);
  const currentId = after.find((entry) => entry.isCurrent)?.id ?? null;
  const started = entries.some((entry) => entry.isCurrent);
  if (!started) return { currentId, round: Math.max(round, 1) };
  return { currentId, round: isNewRound(entries, after) ? round + 1 : round };
}

/** Volta a vez para o anterior; antes do primeiro, o último da rodada de antes (nunca abaixo de 1). */
export function previousTurn(entries: readonly InitiativeEntry[], round: number): InitiativeTurn {
  const ordered = sortInitiative(entries);
  const currentIndex = ordered.findIndex((entry) => entry.isCurrent);
  if (currentIndex === -1) return { currentId: null, round };
  if (currentIndex > 0) return { currentId: ordered[currentIndex - 1]?.id ?? null, round };
  const last = ordered[ordered.length - 1];
  if (round <= 1 || !last) return { currentId: ordered[0]?.id ?? null, round: Math.max(round, 1) };
  return { currentId: last.id, round: round - 1 };
}

/** Posição de quem entra agora: depois de todos, para não passar à frente de um empate já decidido. */
export function nextInitiativePosition(entries: readonly InitiativeEntry[]): number {
  return entries.reduce((highest, entry) => Math.max(highest, entry.position + 1), 0);
}

/**
 * O mestre troca dois empatados de lugar. Só vale entre vizinhos com o mesmo valor (os demais
 * a ordem já decide); devolve as posições novas do grupo empatado, ou nulo se não há troca.
 */
export function moveWithinTie(
  entries: readonly InitiativeEntry[],
  id: string,
  move: TieMove,
): { id: string; position: number }[] | null {
  const ordered = sortInitiative(entries);
  const index = ordered.findIndex((entry) => entry.id === id);
  const neighborIndex = move === 'up' ? index - 1 : index + 1;
  const entry = ordered[index];
  const neighbor = ordered[neighborIndex];
  if (!entry || !neighbor || neighbor.value !== entry.value) return null;
  const tie = ordered.filter((item) => item.value === entry.value);
  const from = tie.indexOf(entry);
  const to = tie.indexOf(neighbor);
  const swapped = [...tie];
  swapped[from] = neighbor;
  swapped[to] = entry;
  // Posições renumeradas a partir da menor do grupo: empates com posição igual também trocam.
  const base = Math.min(...tie.map((item) => item.position));
  return swapped.map((item, offset) => ({ id: item.id, position: base + offset }));
}

/** Quem está empatado com o vizinho, e por isso pode subir ou descer. */
export function tieNeighbors(
  entries: readonly InitiativeEntry[],
  id: string,
): { up: boolean; down: boolean } {
  return {
    up: moveWithinTie(entries, id, 'up') !== null,
    down: moveWithinTie(entries, id, 'down') !== null,
  };
}
