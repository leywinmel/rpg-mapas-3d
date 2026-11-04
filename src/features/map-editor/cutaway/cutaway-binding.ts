import {
  effectiveCutaway,
  stepCutaway,
  NO_CUTAWAY,
  type Cutaway,
  type CutawayDirection,
} from '@/domain/map-v2';

/** O que a tela do mapa sabe do corte de andares de quem está olhando. */
export type CutawayBinding = {
  /** O corte que a pessoa escolheu para si. */
  readonly own: Cutaway;
  readonly setOwn: (cut: Cutaway) => void;
  /** O corte em que o mestre travou os jogadores; null = mesa livre. */
  readonly lock: Cutaway;
  readonly isMaster: boolean;
  /** Só o mestre: trava os jogadores num corte, ou libera com null. */
  readonly changeLock?: (lock: Cutaway) => Promise<void>;
};

export function visibleCutaway(binding: CutawayBinding): Cutaway {
  return effectiveCutaway({
    own: binding.own,
    locked: binding.lock,
    isMaster: binding.isMaster,
  });
}

/**
 * O corte que a pessoa escolhe ao subir ou descer um andar, a partir do que ela vê. O jogador
 * travado não passa da trava; voltar até ela grava "sem escolha", para ele seguir a trava
 * quando o mestre a mudar.
 */
export function steppedOwnCutaway(
  binding: CutawayBinding,
  direction: CutawayDirection,
  top: number,
): Cutaway {
  const next = stepCutaway(visibleCutaway(binding), direction, top);
  const { lock, isMaster } = binding;
  if (isMaster || lock === null) return next;
  if (next === null) return NO_CUTAWAY;
  return next >= lock ? NO_CUTAWAY : next;
}
