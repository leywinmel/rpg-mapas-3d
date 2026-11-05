/**
 * Deslizar de um lugar para outro (RPG-27): a conta que leva uma peça do mapa da pose antiga
 * à nova em vez de ela sumir aqui e aparecer lá. TypeScript puro: a cena só pede a pose de cada
 * quadro.
 */

/** Pose no mundo: centro da peça, altura da base e giro em graus em torno do eixo vertical. */
export type GlidePose = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotationY: number;
};

const FULL_TURN_DEGREES = 360;
const HALF_TURN_DEGREES = FULL_TURN_DEGREES / 2;

/**
 * Quanto do caminho já foi feito (0 a 1), suavizado nas pontas: a peça arranca e freia devagar,
 * como um carro, em vez de começar e parar de supetão. Duração zero chega na hora.
 */
export function glideProgress(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  const linear = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  return linear * linear * (3 - 2 * linear);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Giro no meio do caminho pelo lado mais curto: de 270° para 0° a peça vira 90° para a frente,
 * e não 270° para trás.
 */
export function lerpAngleDegrees(from: number, to: number, t: number): number {
  const turn =
    ((((to - from) % FULL_TURN_DEGREES) + FULL_TURN_DEGREES + HALF_TURN_DEGREES) %
      FULL_TURN_DEGREES) -
    HALF_TURN_DEGREES;
  return from + turn * t;
}

/** A pose em `t` (0 = de onde saiu, 1 = onde chega). */
export function interpolatePose(from: GlidePose, to: GlidePose, t: number): GlidePose {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    z: lerp(from.z, to.z, t),
    rotationY: lerpAngleDegrees(from.rotationY, to.rotationY, t),
  };
}
