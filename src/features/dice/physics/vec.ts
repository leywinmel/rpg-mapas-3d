/**
 * Matemática mínima de vetores e rotações, só com somas, produtos e raiz quadrada
 * (operações exatas em qualquer navegador). Evita seno e cosseno de propósito: a
 * forma dos dados e a leitura das faces têm de dar o mesmo bit em todas as máquinas.
 */

export type Vec3 = readonly [number, number, number];
/** Rotação como quatérnion unitário: x, y, z, w. */
export type Quat = readonly [number, number, number, number];

export const ORIGIN: Vec3 = [0, 0, 0];
export const WORLD_UP: Vec3 = [0, 1, 0];
export const IDENTITY: Quat = [0, 0, 0, 1];

/** Abaixo disto (produto escalar) dois vetores unitários contam como opostos. */
const OPPOSITE_LIMIT = -1 + 1e-9;
/** Eixo com |x| menor que isto serve de referência para achar um vetor perpendicular. */
const REFERENCE_AXIS_LIMIT = 0.9;

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, factor: number): Vec3 {
  return [a[0] * factor, a[1] * factor, a[2] * factor];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Vec3): Vec3 {
  const size = length(a);
  if (size === 0) throw new RangeError('Não dá para normalizar o vetor nulo.');
  return scale(a, 1 / size);
}

export function centroid(points: readonly Vec3[]): Vec3 {
  const sum = points.reduce<Vec3>((total, point) => add(total, point), [0, 0, 0]);
  return scale(sum, 1 / points.length);
}

/** Rotaciona `v` pelo quatérnion unitário `q`. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const axis: Vec3 = [q[0], q[1], q[2]];
  const twice = scale(cross(axis, v), 2);
  return add(add(v, scale(twice, q[3])), cross(axis, twice));
}

export function multiply(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function normalizeQuat(q: Quat): Quat {
  const size = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  if (size === 0) throw new RangeError('Rotação nula.');
  return [q[0] / size, q[1] / size, q[2] / size, q[3] / size];
}

/** Algum vetor perpendicular a `v` (para girar 180° quando não há eixo único). */
function anyPerpendicular(v: Vec3): Vec3 {
  const reference: Vec3 = Math.abs(v[0]) < REFERENCE_AXIS_LIMIT ? [1, 0, 0] : [0, 1, 0];
  return normalize(cross(v, reference));
}

/** A menor rotação que leva o vetor unitário `from` até o vetor unitário `to`. */
export function rotationBetween(from: Vec3, to: Vec3): Quat {
  const similarity = dot(from, to);
  if (similarity < OPPOSITE_LIMIT) {
    const axis = anyPerpendicular(from);
    return [axis[0], axis[1], axis[2], 0];
  }
  const axis = cross(from, to);
  return normalizeQuat([axis[0], axis[1], axis[2], 1 + similarity]);
}
