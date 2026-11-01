/**
 * O resultado exibido é sempre o da linha do banco. Se a simulação local terminou em
 * outra face (versões diferentes do app, por exemplo), esta etapa descobre quais dados
 * precisam girar e para onde, e a bandeja faz uma transição curta até lá.
 */
import { orientationForValue, readValue, splitHundred } from './orientation';
import { BODY_KINDS } from './shapes';
import { rotationAt, type SimulatedThrow } from './simulate';
import type { Quat } from './vec';

/** Um corpo que precisa girar da pose final da simulação até a que mostra a face certa. */
export type BodyCorrection = {
  readonly body: number;
  readonly from: Quat;
  readonly to: Quat;
};

/** O valor que cada corpo físico deve mostrar para o dado lógico valer `value`. */
function targetValues(kindCount: number, value: number): number[] {
  if (kindCount === 1) return [value];
  const { tens, units } = splitHundred(value);
  return [tens, units];
}

/**
 * Correções para a simulação casar com os valores gravados (na ordem dos dados).
 * Vazio quando já casa ou quando os valores gravados não servem para este arremesso
 * (quantidade ou valor impossível): nesse caso só o placar do banco vale.
 */
export function planCorrections(
  sim: SimulatedThrow,
  expectedValues: readonly number[],
): BodyCorrection[] {
  if (expectedValues.length !== sim.sides.length) return [];
  const corrections: BodyCorrection[] = [];
  let firstBody = 0;

  sim.sides.forEach((sides, dieIndex) => {
    const kinds = BODY_KINDS[sides];
    const expected = expectedValues[dieIndex];
    const bodyStart = firstBody;
    firstBody += kinds.length;
    if (expected === undefined || expected === sim.values[dieIndex]) return;

    targetValues(kinds.length, expected).forEach((target, offset) => {
      const kind = kinds[offset];
      if (!kind) return;
      const body = bodyStart + offset;
      const from = rotationAt(sim, sim.frameCount - 1, body);
      if (readValue(kind, from) === target) return;
      const to = orientationForValue(kind, from, target);
      if (to) corrections.push({ body, from, to });
    });
  });
  return corrections;
}
