/**
 * Ler o valor de um dado parado, medir se ele está reto e, quando preciso, achar a
 * rotação que vira a face certa para cima.
 */
import { getDieShape, type DieKind } from './shapes';
import {
  multiply,
  normalizeQuat,
  rotate,
  rotationBetween,
  WORLD_UP,
  type Quat,
  type Vec3,
} from './vec';

const RADIANS_TO_DEGREES = 180 / Math.PI;

/** O d100 tem dois dados: dezenas (00 a 90) e unidades (0 a 9). 00 + 0 vale 100. */
export const HUNDRED = 100;
const TENS_STEP = 10;

export function combineHundred(tens: number, units: number): number {
  return tens + units || HUNDRED;
}

export function splitHundred(value: number): { tens: number; units: number } {
  if (value === HUNDRED) return { tens: 0, units: 0 };
  return { tens: Math.floor(value / TENS_STEP) * TENS_STEP, units: value % TENS_STEP };
}

/** O quanto a direção `up` do valor lido está alinhada com o "para cima" (1 = em pé). */
function alignment(rotation: Quat, up: Vec3): number {
  return rotate(rotation, up)[1];
}

type Reading = { value: number; alignment: number };

function bestReading(kind: DieKind, rotation: Quat): Reading {
  let best: Reading = { value: Number.NaN, alignment: Number.NEGATIVE_INFINITY };
  for (const reading of getDieShape(kind).readings) {
    const candidate = alignment(rotation, reading.up);
    // Empate exato (dado em pé numa aresta) fica com o primeiro: determinístico.
    if (candidate > best.alignment) best = { value: reading.value, alignment: candidate };
  }
  return best;
}

/** O valor que o dado mostra para cima com esta rotação (convenção do d4 em `shapes.ts`). */
export function readValue(kind: DieKind, rotation: Quat): number {
  return bestReading(kind, rotation).value;
}

/** Desvio, em graus, entre a face lida e o "para cima": perto de 0 = assentado reto. */
export function tiltDegrees(kind: DieKind, rotation: Quat): number {
  const cosine = Math.min(1, Math.max(-1, bestReading(kind, rotation).alignment));
  return Math.acos(cosine) * RADIANS_TO_DEGREES;
}

/**
 * Rotação final que mostra `value` para cima, partindo da atual pelo menor giro
 * possível. Devolve nulo se o dado não tem esse valor.
 */
export function orientationForValue(kind: DieKind, current: Quat, value: number): Quat | null {
  const reading = getDieShape(kind).readings.find((candidate) => candidate.value === value);
  if (!reading) return null;
  const turn = rotationBetween(rotate(current, reading.up), WORLD_UP);
  return normalizeQuat(multiply(turn, current));
}
