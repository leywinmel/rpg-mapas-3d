import { effectiveCutaway, NO_CUTAWAY, type Cutaway } from '@/domain/map-v2';

/**
 * O que a tela do mestre sabe do corte de andares. Só ele tem este controle (RPG-30): o
 * jogador vê o andar que o mestre escolheu para a mesa, sem escolha própria.
 */
export type CutawayBinding = {
  /** O corte que o mestre olha sozinho, sem mudar o que a mesa vê. */
  readonly own: Cutaway;
  readonly setOwn: (cut: Cutaway) => void;
  /** O andar que os jogadores veem (rooms.cutaway_lock); null = todos os andares. */
  readonly tableCutaway: Cutaway;
  /**
   * Grava o andar que os jogadores veem; null mostra todos. Sem ele (página de
   * desenvolvimento, sem sala), a parte da mesa não aparece no controle.
   */
  readonly setTableCutaway?: (cut: Cutaway) => Promise<void>;
};

/** O corte que o mestre vê na própria tela. */
export function masterCutaway(binding: CutawayBinding): Cutaway {
  return effectiveCutaway({ own: binding.own, locked: binding.tableCutaway, isMaster: true });
}

/** O corte que o jogador vê: só o que o mestre escolheu para a mesa. */
export function playerCutaway(tableCutaway: Cutaway): Cutaway {
  return effectiveCutaway({ own: NO_CUTAWAY, locked: tableCutaway, isMaster: false });
}
