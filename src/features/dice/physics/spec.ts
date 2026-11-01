/**
 * O arremesso: onde cada dado nasce e com que velocidade. Quem rola sorteia isto
 * (com `crypto.getRandomValues`) e manda para a mesa; todos rodam a mesma simulação
 * com a mesma entrada e veem os dados caírem do mesmo jeito.
 */
import { z } from 'zod';
import { DICE_SIDES, MAX_DICE_PER_ROLL, type DieSides } from '@/domain';
import {
  LIMIT_ANGULAR_SPEED,
  LIMIT_LINEAR_SPEED,
  LIMIT_POSITION_HEIGHT,
  SPAWN_BASE_HEIGHT,
  SPAWN_COLUMNS,
  SPAWN_FRONT_MARGIN,
  SPAWN_JITTER,
  SPAWN_LAYER_HEIGHT,
  SPAWN_ROWS,
  SPAWN_SPACING,
  SPEC_DECIMALS,
  SPIN_MAX,
  SPIN_MIN,
  THROW_CENTERING_FACTOR,
  THROW_LIFT_MAX,
  THROW_LIFT_MIN,
  THROW_SIDEWAYS_SPEED,
  THROW_SPEED_MAX,
  THROW_SPEED_MIN,
  TRAY_HALF_DEPTH,
  TRAY_HALF_WIDTH,
} from './constants';
import { BODY_KINDS } from './shapes';
import type { Quat, Vec3 } from './vec';

/** Posição, giro e velocidades de um corpo físico no instante do arremesso. */
export type BodyStart = {
  readonly position: Vec3;
  readonly rotation: Quat;
  readonly linearVelocity: Vec3;
  readonly angularVelocity: Vec3;
};

/** Um dado da rolagem. O d100 tem dois corpos (dezenas e unidades), os outros um. */
export type DieThrow = {
  readonly sides: DieSides;
  readonly bodies: readonly BodyStart[];
};

export type ThrowSpec = {
  readonly dice: readonly DieThrow[];
};

/** Sorteio uniforme em [0, 1). Injetável para os testes usarem uma sequência fixa. */
export type Random = () => number;

const UINT32_RANGE = 2 ** 32;
const FULL_TURN = 2 * Math.PI;

/** Sorteio do navegador (criptográfico), sem Math.random. */
export function secureRandom(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] ?? 0) / UINT32_RANGE;
}

// ------------------------------------------------------------------ Validação
const MIN_QUATERNION_NORM = 0.5;
const MAX_QUATERNION_NORM = 1.5;

function limited(limit: number) {
  return z.number().min(-limit).max(limit);
}

const positionSchema = z.tuple([
  limited(TRAY_HALF_WIDTH),
  z.number().min(0).max(LIMIT_POSITION_HEIGHT),
  limited(TRAY_HALF_DEPTH),
]);

const rotationSchema = z.tuple([limited(1), limited(1), limited(1), limited(1)]).refine((q) => {
  const norm = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2);
  return norm >= MIN_QUATERNION_NORM && norm <= MAX_QUATERNION_NORM;
});

const bodyStartSchema = z.object({
  position: positionSchema,
  rotation: rotationSchema,
  linearVelocity: z.tuple([
    limited(LIMIT_LINEAR_SPEED),
    limited(LIMIT_LINEAR_SPEED),
    limited(LIMIT_LINEAR_SPEED),
  ]),
  angularVelocity: z.tuple([
    limited(LIMIT_ANGULAR_SPEED),
    limited(LIMIT_ANGULAR_SPEED),
    limited(LIMIT_ANGULAR_SPEED),
  ]),
});

const dieThrowSchema = z
  .object({
    sides: z.number().refine(isDieSides, { message: 'Dado inexistente.' }),
    bodies: z.array(bodyStartSchema).min(1),
  })
  .refine((die) => isDieSides(die.sides) && die.bodies.length === BODY_KINDS[die.sides].length, {
    message: 'Quantidade de corpos incompatível com o dado.',
  });

/**
 * O arremesso chega pela rede de qualquer membro da mesa: confere formato e limites
 * antes de simular (número fora da faixa, NaN ou 10 mil dados travariam todo mundo).
 */
export const throwSpecSchema = z.object({
  dice: z.array(dieThrowSchema).min(1).max(MAX_DICE_PER_ROLL),
});

function isDieSides(value: number): value is DieSides {
  return (DICE_SIDES as readonly number[]).includes(value);
}

// -------------------------------------------------------------------- Sorteio
const DECIMAL_FACTOR = 10 ** SPEC_DECIMALS;

function round(value: number): number {
  // Evita "-0", que viraria "0" na rede e mudaria o bit de quem sorteou.
  const rounded = Math.round(value * DECIMAL_FACTOR) / DECIMAL_FACTOR;
  return rounded === 0 ? 0 : rounded;
}

function roundVec(v: Vec3): Vec3 {
  return [round(v[0]), round(v[1]), round(v[2])];
}

function between(random: Random, min: number, max: number): number {
  return min + random() * (max - min);
}

function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    const held = result[index];
    const swapped = result[other];
    if (held === undefined || swapped === undefined) continue;
    result[index] = swapped;
    result[other] = held;
  }
  return result;
}

type SpawnSlot = { readonly column: number; readonly row: number; readonly layer: number };

/** Lugares de largada, camada por camada, embaralhados dentro de cada camada. */
function spawnSlots(count: number, random: Random): SpawnSlot[] {
  const perLayer = SPAWN_COLUMNS * SPAWN_ROWS;
  const layers = Math.ceil(count / perLayer);
  const slots: SpawnSlot[] = [];
  for (let layer = 0; layer < layers; layer++) {
    const inLayer = Array.from({ length: perLayer }, (_, index) => ({
      column: index % SPAWN_COLUMNS,
      row: Math.floor(index / SPAWN_COLUMNS),
      layer,
    }));
    slots.push(...shuffle(inLayer, random));
  }
  return slots.slice(0, count);
}

function spawnPosition(slot: SpawnSlot, random: Random): Vec3 {
  const span = ((SPAWN_COLUMNS - 1) * SPAWN_SPACING) / 2;
  const jitter = () => between(random, -SPAWN_JITTER, SPAWN_JITTER);
  return [
    slot.column * SPAWN_SPACING - span + jitter(),
    SPAWN_BASE_HEIGHT + slot.layer * SPAWN_LAYER_HEIGHT + jitter(),
    TRAY_HALF_DEPTH - SPAWN_FRONT_MARGIN - slot.row * SPAWN_SPACING + jitter(),
  ];
}

/** Rotação uniforme (método de Shoemake): nenhuma orientação é mais provável que outra. */
function randomRotation(random: Random): Quat {
  const first = random();
  const angleA = FULL_TURN * random();
  const angleB = FULL_TURN * random();
  const outer = Math.sqrt(1 - first);
  const inner = Math.sqrt(first);
  return [
    outer * Math.sin(angleA),
    outer * Math.cos(angleA),
    inner * Math.sin(angleB),
    inner * Math.cos(angleB),
  ];
}

/** Direção uniforme na esfera. */
function randomDirection(random: Random): Vec3 {
  const height = 2 * random() - 1;
  const angle = FULL_TURN * random();
  const ring = Math.sqrt(1 - height * height);
  return [ring * Math.cos(angle), height, ring * Math.sin(angle)];
}

function bodyStartAt(slot: SpawnSlot, random: Random): BodyStart {
  const position = spawnPosition(slot, random);
  const speed = between(random, THROW_SPEED_MIN, THROW_SPEED_MAX);
  // Joga para o fundo da bandeja, com um empurrão para o meio e um pouco de lado.
  const sideways = between(random, -THROW_SIDEWAYS_SPEED, THROW_SIDEWAYS_SPEED);
  const linearVelocity: Vec3 = [
    sideways - position[0] * THROW_CENTERING_FACTOR,
    between(random, THROW_LIFT_MIN, THROW_LIFT_MAX),
    -speed,
  ];
  const spin = between(random, SPIN_MIN, SPIN_MAX);
  const axis = randomDirection(random);
  const rotation = randomRotation(random);
  return {
    position: roundVec(position),
    rotation: [round(rotation[0]), round(rotation[1]), round(rotation[2]), round(rotation[3])],
    linearVelocity: roundVec(linearVelocity),
    angularVelocity: roundVec([axis[0] * spin, axis[1] * spin, axis[2] * spin]),
  };
}

/** Sorteia as condições iniciais de uma rolagem, na ordem dos dados (ver `diceToThrow`). */
export function createThrowSpec(
  dice: readonly DieSides[],
  random: Random = secureRandom,
): ThrowSpec {
  const bodyCount = dice.reduce((total, sides) => total + BODY_KINDS[sides].length, 0);
  const slots = spawnSlots(bodyCount, random);
  let next = 0;
  return {
    dice: dice.map((sides) => ({
      sides,
      bodies: BODY_KINDS[sides].map(() => {
        const slot = slots[next++];
        if (!slot) throw new Error('Faltou lugar de largada para os dados.');
        return bodyStartAt(slot, random);
      }),
    })),
  };
}
