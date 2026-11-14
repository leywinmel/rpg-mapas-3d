// Formas orgânicas de faces chapadas (troncos, copas, pedras, pétalas) sobre o builder do
// piece-mesh.mjs. Servem à vegetação e aos enfeites de praça (fonte, estátua).

/** Gerador pseudoaleatório com semente: cada peça varia, mas igual a cada execução. */
export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const unit = (a) => scale(a, 1 / (Math.hypot(...a) || 1));

/**
 * Triângulo virado para fora: o builder tira a normal da ordem dos cantos, então a ordem é
 * trocada quando a face aponta para `inside` (o miolo da forma).
 */
export function face(mesh, [a, b, c], inside) {
  const normal = cross(sub(b, a), sub(c, a));
  const centroid = scale(add(add(a, b), c), 1 / 3);
  if (dot(normal, sub(centroid, inside)) < 0) mesh.tri(a, c, b);
  else mesh.tri(a, b, c);
}

/** Triângulo visível dos dois lados (folha de palmeira, pétala): o material não é dupla face. */
export function sheet(mesh, a, b, c) {
  mesh.tri(a, b, c);
  mesh.tri(a, c, b);
}

/** Tronco cônico de `from` a `to` (raio r0 embaixo, r1 em cima; r1 = 0 vira cone). */
export function segment(mesh, { from, to, r0, r1, sides = 6, caps = true, twist = 0 }) {
  const axis = unit(sub(to, from));
  const helper = Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(axis, helper));
  const v = cross(axis, u);
  const ring = (center, radius) =>
    Array.from({ length: sides }, (_, i) => {
      const angle = twist + (i / sides) * Math.PI * 2;
      return add(
        center,
        add(scale(u, Math.cos(angle) * radius), scale(v, Math.sin(angle) * radius)),
      );
    });
  const bottom = ring(from, r0);
  const top = ring(to, r1);
  const middle = scale(add(from, to), 0.5);
  for (let i = 0; i < sides; i += 1) {
    const j = (i + 1) % sides;
    face(mesh, [bottom[i], bottom[j], top[j]], middle);
    if (r1 > 0) face(mesh, [bottom[i], top[j], top[i]], middle);
  }
  if (!caps) return;
  const below = sub(from, axis);
  const above = add(to, axis);
  for (let i = 1; i < sides - 1; i += 1) {
    if (r1 > 0) face(mesh, [top[0], top[i], top[i + 1]], below);
    face(mesh, [bottom[0], bottom[i], bottom[i + 1]], above);
  }
}

const PHI = (1 + Math.sqrt(5)) / 2;
const ICOSA_POINTS = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
].map(unit);
const ICOSA_FACES = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

/** Bolota de 20 faces amassada (copa, arbusto, pedra): o "torto" vem da semente. */
export function blob(
  mesh,
  { center, radius: [rx, ry, rz], jitter = 0.18, rand, flatBottom = false },
) {
  const points = ICOSA_POINTS.map(([x, y, z]) => {
    const wobble = 1 + (rand() * 2 - 1) * jitter;
    const point = add(center, [x * rx * wobble, y * ry * wobble, z * rz * wobble]);
    // Base achatada no chão: sem isso o arbusto e a pedra flutuam um pouco acima da casa.
    if (flatBottom && y < -0.3) point[1] = 0;
    return point;
  });
  for (const [a, b, c] of ICOSA_FACES) face(mesh, [points[a], points[b], points[c]], center);
}

/** Ponto a `length` de `from`, inclinado `tilt` radianos da vertical, na direção `heading`. */
export function lean(from, length, tilt, heading) {
  return add(from, [
    Math.sin(tilt) * Math.cos(heading) * length,
    Math.cos(tilt) * length,
    Math.sin(tilt) * Math.sin(heading) * length,
  ]);
}
