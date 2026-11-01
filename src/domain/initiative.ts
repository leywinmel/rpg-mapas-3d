/** Ordem de iniciativa: quem age primeiro no combate e de quem é a vez. */

export type InitiativeEntry = {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  /** Desempate manual definido pelo mestre (menor vem antes). */
  readonly position: number;
  readonly isCurrent: boolean;
};

/** Maior iniciativa primeiro; empate decidido pela posição e, por fim, pelo nome. */
export function sortInitiative(entries: readonly InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.value - a.value || a.position - b.position || a.label.localeCompare(b.label, 'pt-BR'),
  );
}

/** Passa a vez para o próximo da ordem; depois do último, volta ao primeiro. */
export function advanceTurn(entries: readonly InitiativeEntry[]): InitiativeEntry[] {
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
