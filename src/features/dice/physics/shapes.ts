/**
 * A forma real de cada dado: vértices, faces, os números impressos e, para cada
 * valor possível, a direção que precisa apontar para cima para ele ser lido.
 *
 * Só soma, produto e raiz quadrada entram nas coordenadas (nada de seno/cosseno),
 * então o colisor tem exatamente os mesmos bits em todos os navegadores.
 *
 * Convenção de leitura:
 * - d6, d8, d10, d12 e d20: vale a face virada para cima.
 * - d4: vale o número do vértice que aponta para cima (o mesmo número aparece
 *   no canto de cima das três faces que o rodeiam). Quando o dado descansa numa
 *   face, a face de baixo é a oposta a esse vértice.
 * - d100: dois d10. Um tem as dezenas (00 a 90) e o outro as unidades (0 a 9);
 *   00 + 0 vale 100.
 */
import type { DieSides } from '@/domain';
import { centroid, cross, dot, length, normalize, ORIGIN, scale, sub, type Vec3 } from './vec';

export type DieKind = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100-tens' | 'd100-units';

/** Número impresso numa face: onde fica e para onde aponta o topo do texto. */
export type DieLabel = {
  readonly text: string;
  readonly center: Vec3;
  readonly normal: Vec3;
  /** Direção, no plano da face, para onde aponta o topo do número. */
  readonly up: Vec3;
  /** Metade do lado do quadrado onde o número é desenhado. */
  readonly halfSize: number;
};

export type DieReading = {
  readonly value: number;
  /** Direção (no espaço do dado) que precisa apontar para cima para esse valor valer. */
  readonly up: Vec3;
};

export type DieShape = {
  readonly kind: DieKind;
  readonly vertices: readonly Vec3[];
  /** Cada face é uma lista de índices de vértices, em sentido anti-horário visto de fora. */
  readonly faces: readonly (readonly number[])[];
  readonly readings: readonly DieReading[];
  readonly labels: readonly DieLabel[];
};

/** Corpos físicos de cada dado lógico: o d100 vira dois d10. */
export const BODY_KINDS: Readonly<Record<DieSides, readonly DieKind[]>> = {
  4: ['d4'],
  6: ['d6'],
  8: ['d8'],
  10: ['d10'],
  12: ['d12'],
  20: ['d20'],
  100: ['d100-tens', 'd100-units'],
};

export const DIE_KINDS = [
  'd4',
  'd6',
  'd8',
  'd10',
  'd12',
  'd20',
  'd100-tens',
  'd100-units',
] as const satisfies readonly DieKind[];

// ------------------------------------------------------------- Dimensões
/** Raio do círculo que passa por todos os vértices (tamanho do dado na bandeja). */
const CIRCUMRADIUS: Readonly<Record<Exclude<DieKind, 'd10' | 'd100-tens' | 'd100-units'>, number>> =
  {
    d4: 1.0,
    d6: 0.95,
    d8: 0.95,
    d12: 1.0,
    d20: 1.05,
  };
/** O d10 é definido pelos dois raios abaixo (o anel do meio e as pontas). */
const D10_RING_RADIUS = 0.88;
const D10_APEX_HEIGHT = 1.02;

// Tolerâncias do desenho (as formas têm raio perto de 1)
const FACE_EPSILON = 1e-6;
const OPPOSITE_FACE_DOT = 1 - 1e-9;
const EDGE_LENGTH_SQUARED_ICOSAHEDRON = 4;
const EDGE_TOLERANCE = 1e-6;

// ------------------------------------------------------ Tamanho dos números
/** Metade do lado do número, como múltiplo do raio do maior círculo que cabe na face. */
const LABEL_FILL = { triangle: 1, square: 0.95, pentagon: 0.85, kite: 1.05, corner: 0.8 } as const;
/** Ponto do d10 onde o número fica, contado a partir da ponta da pipa (0 = ponta). */
const KITE_LABEL_ANCHOR = 0.56;
/** O número do d4 fica a esta fração do caminho entre o centro da face e o canto. */
const CORNER_LABEL_ANCHOR = 0.55;
const TRIANGLE_SIDES = 3;
const SQUARE_SIDES = 4;

const SQRT5 = Math.sqrt(5);
const PHI = (1 + SQRT5) / 2;
/** cos 36°, cos 72°, sen 36° e sen 72° em forma fechada (só raiz quadrada). */
const COS_36 = PHI / 2;
const COS_72 = (SQRT5 - 1) / 4;
const SIN_36 = Math.sqrt(10 - 2 * SQRT5) / 4;
const SIN_72 = Math.sqrt(10 + 2 * SQRT5) / 4;

type RawSolid = {
  vertices: Vec3[];
  faces: number[][];
};

// --------------------------------------------------------------- Auxiliares
function faceNormal(points: readonly Vec3[]): Vec3 {
  // Método de Newell: vale para polígonos planos de qualquer tamanho.
  let nx = 0;
  let ny = 0;
  let nz = 0;
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length] ?? a;
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  });
  return normalize([nx, ny, nz]);
}

/** Ordena os vértices de uma face em sentido anti-horário visto de fora. */
function orderAroundNormal(
  vertices: readonly Vec3[],
  indices: readonly number[],
  normal: Vec3,
): number[] {
  const points = indices.map((index) => vertices[index] ?? ORIGIN);
  const middle = centroid(points);
  const first = points[0];
  if (!first) return [];
  const axisU = normalize(sub(first, middle));
  const axisV = cross(normal, axisU);
  const angleOf = (point: Vec3) => {
    const offset = sub(point, middle);
    return Math.atan2(dot(offset, axisV), dot(offset, axisU));
  };
  return indices
    .map((index, position) => ({ index, angle: angleOf(points[position] ?? first) }))
    .sort((a, b) => a.angle - b.angle)
    .map((entry) => entry.index);
}

/** Faces = os vértices que mais avançam na direção de cada normal dada. */
function facesFromNormals(vertices: readonly Vec3[], normals: readonly Vec3[]): number[][] {
  return normals.map((direction) => {
    const unit = normalize(direction);
    const best = Math.max(...vertices.map((vertex) => dot(vertex, unit)));
    const indices = vertices.flatMap((vertex, index) =>
      best - dot(vertex, unit) < FACE_EPSILON ? [index] : [],
    );
    return orderAroundNormal(vertices, indices, unit);
  });
}

function scaleToCircumradius(vertices: readonly Vec3[], radius: number): Vec3[] {
  const current = Math.max(...vertices.map(length));
  return vertices.map((vertex) => scale(vertex, radius / current));
}

function signedTriples(): Vec3[] {
  const signs = [-1, 1] as const;
  return signs.flatMap((x) => signs.flatMap((y) => signs.map((z): Vec3 => [x, y, z])));
}

// ------------------------------------------------------------------ Sólidos
function tetrahedron(): RawSolid {
  const vertices: Vec3[] = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ];
  // A face i é a oposta ao vértice i.
  const faces = vertices.map((vertex, opposite) => {
    const indices = vertices.flatMap((_, index) => (index === opposite ? [] : [index]));
    return orderAroundNormal(vertices, indices, normalize(scale(vertex, -1)));
  });
  return { vertices: scaleToCircumradius(vertices, CIRCUMRADIUS.d4), faces };
}

function cube(): RawSolid {
  const vertices = signedTriples();
  const normals: Vec3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  return {
    vertices: scaleToCircumradius(vertices, CIRCUMRADIUS.d6),
    faces: facesFromNormals(vertices, normals),
  };
}

function octahedron(): RawSolid {
  const vertices: Vec3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  return {
    vertices: scaleToCircumradius(vertices, CIRCUMRADIUS.d8),
    faces: facesFromNormals(vertices, signedTriples()),
  };
}

function dodecahedron(): RawSolid {
  const inverse = 1 / PHI;
  const vertices: Vec3[] = [...signedTriples()];
  const pairs = [-1, 1] as const;
  for (const a of pairs) {
    for (const b of pairs) {
      vertices.push(
        [0, a * inverse, b * PHI],
        [a * inverse, b * PHI, 0],
        [a * PHI, 0, b * inverse],
      );
    }
  }
  const normals: Vec3[] = [];
  for (const a of pairs) {
    for (const b of pairs) {
      normals.push([0, a * PHI, b], [a * PHI, b, 0], [a, 0, b * PHI]);
    }
  }
  return {
    vertices: scaleToCircumradius(vertices, CIRCUMRADIUS.d12),
    faces: facesFromNormals(vertices, normals),
  };
}

function icosahedron(): RawSolid {
  const vertices: Vec3[] = [];
  const pairs = [-1, 1] as const;
  for (const a of pairs) {
    for (const b of pairs) {
      vertices.push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]);
    }
  }
  const faces: number[][] = [];
  const distanceSquared = (i: number, j: number) => {
    const offset = sub(vertices[i] ?? ORIGIN, vertices[j] ?? ORIGIN);
    return dot(offset, offset);
  };
  const adjacent = (i: number, j: number) =>
    Math.abs(distanceSquared(i, j) - EDGE_LENGTH_SQUARED_ICOSAHEDRON) < EDGE_TOLERANCE;
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      for (let k = j + 1; k < vertices.length; k++) {
        if (!adjacent(i, j) || !adjacent(j, k) || !adjacent(i, k)) continue;
        const middle = centroid([
          vertices[i] ?? ORIGIN,
          vertices[j] ?? ORIGIN,
          vertices[k] ?? ORIGIN,
        ]);
        faces.push(orderAroundNormal(vertices, [i, j, k], normalize(middle)));
      }
    }
  }
  return { vertices: scaleToCircumradius(vertices, CIRCUMRADIUS.d20), faces };
}

/**
 * Trapezoedro pentagonal: duas pontas e dois anéis de 5 vértices, formando 10 faces
 * em pipa. A razão ponta/anel abaixo é a que deixa cada pipa perfeitamente plana.
 */
function pentagonalTrapezohedron(): RawSolid {
  const ring = D10_RING_RADIUS;
  const apex = D10_APEX_HEIGHT;
  const ringHeight = (apex * (1 - COS_36)) / (1 + COS_36);
  const upperAngles: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [COS_72, SIN_72],
    [-COS_36, SIN_36],
    [-COS_36, -SIN_36],
    [COS_72, -SIN_72],
  ];
  const lowerAngles: ReadonlyArray<readonly [number, number]> = [
    [COS_36, SIN_36],
    [-COS_72, SIN_72],
    [-1, 0],
    [-COS_72, -SIN_72],
    [COS_36, -SIN_36],
  ];
  const vertices: Vec3[] = [
    [0, apex, 0],
    [0, -apex, 0],
    ...upperAngles.map(([cos, sin]): Vec3 => [ring * cos, ringHeight, ring * sin]),
    ...lowerAngles.map(([cos, sin]): Vec3 => [ring * cos, -ringHeight, ring * sin]),
  ];
  const top = 0;
  const bottom = 1;
  const upper = (index: number) => 2 + (index % 5);
  const lower = (index: number) => 7 + (index % 5);

  // Cada pipa: ponta, vértice do anel, vértice da cauda e outro do anel (a ponta vem primeiro
  // e a cauda é sempre o terceiro, porque os números se guiam por esses dois).
  const faces: number[][] = [];
  for (let index = 0; index < 5; index++) {
    faces.push([top, upper(index), lower(index), upper(index + 1)]);
  }
  for (let index = 0; index < 5; index++) {
    faces.push([bottom, lower(index), upper(index + 1), lower(index + 1)]);
  }
  return { vertices, faces: faces.map((indices) => orientOutward(vertices, indices)) };
}

/**
 * Deixa a lista de vértices em sentido anti-horário visto de fora, mantendo o primeiro
 * e o terceiro no lugar quando possível (inverte só os vizinhos do primeiro).
 */
function orientOutward(vertices: readonly Vec3[], indices: readonly number[]): number[] {
  const points = indices.map((index) => vertices[index] ?? ORIGIN);
  if (dot(faceNormal(points), centroid(points)) >= 0) return [...indices];
  const [first = 0, ...rest] = indices;
  return [first, ...rest.reverse()];
}

/** Normal da face apontando para fora do sólido (centro na origem). */
function faceNormalFacing(points: readonly Vec3[], outward: Vec3): Vec3 {
  const normal = faceNormal(points);
  return dot(normal, outward) >= 0 ? normal : scale(normal, -1);
}

// -------------------------------------------------------- Montagem do dado
function faceCenter(vertices: readonly Vec3[], face: readonly number[]): Vec3 {
  return centroid(face.map((index) => vertices[index] ?? ORIGIN));
}

function outwardNormal(vertices: readonly Vec3[], face: readonly number[]): Vec3 {
  const points = face.map((index) => vertices[index] ?? ORIGIN);
  return faceNormalFacing(points, normalize(centroid(points)));
}

/** Distância do centro da face até a borda mais próxima (cabe um número desse tamanho). */
function faceInradius(vertices: readonly Vec3[], face: readonly number[], center: Vec3): number {
  const distances = face.map((index, position) => {
    const a = vertices[index] ?? ORIGIN;
    const b = vertices[face[(position + 1) % face.length] ?? index] ?? a;
    const edge = sub(b, a);
    return length(cross(edge, sub(center, a))) / length(edge);
  });
  return Math.min(...distances);
}

function oppositeIndex(normals: readonly Vec3[], index: number): number {
  const target = scale(normals[index] ?? [0, 1, 0], -1);
  const found = normals.findIndex((candidate) => dot(candidate, target) > OPPOSITE_FACE_DOT);
  if (found < 0) throw new Error(`Face ${index} sem face oposta.`);
  return found;
}

/** Valores por face de modo que faces opostas somem o mesmo (como num dado de verdade). */
function valuesWithOppositePairs(normals: readonly Vec3[], values: readonly number[]): number[] {
  const assigned: Array<number | undefined> = normals.map(() => undefined);
  let next = 0;
  normals.forEach((_, index) => {
    if (assigned[index] !== undefined) return;
    assigned[index] = values[next];
    assigned[oppositeIndex(normals, index)] = values[values.length - 1 - next];
    next += 1;
  });
  return assigned.map((value) => value ?? 0);
}

const rangeFrom = (first: number, last: number, step = 1): number[] =>
  Array.from({ length: Math.floor((last - first) / step) + 1 }, (_, index) => first + index * step);

/** Valores impressos de cada tipo, em ordem crescente. */
const FACE_VALUES: Readonly<Record<DieKind, readonly number[]>> = {
  d4: rangeFrom(1, 4),
  d6: rangeFrom(1, 6),
  d8: rangeFrom(1, 8),
  d10: rangeFrom(1, 10),
  d12: rangeFrom(1, 12),
  d20: rangeFrom(1, 20),
  'd100-tens': rangeFrom(0, 90, 10),
  'd100-units': rangeFrom(0, 9),
};

function labelText(kind: DieKind, value: number): string {
  return kind === 'd100-tens' && value === 0 ? '00' : String(value);
}

function rawSolidFor(kind: DieKind): RawSolid {
  switch (kind) {
    case 'd4':
      return tetrahedron();
    case 'd6':
      return cube();
    case 'd8':
      return octahedron();
    case 'd12':
      return dodecahedron();
    case 'd20':
      return icosahedron();
    case 'd10':
    case 'd100-tens':
    case 'd100-units':
      return pentagonalTrapezohedron();
  }
}

type Printing = { readings: DieReading[]; labels: DieLabel[] };

/** No d4 cada vértice tem um número, repetido no canto de cada face que o toca. */
function printTetrahedron(kind: DieKind, solid: RawSolid): Printing {
  const { vertices, faces } = solid;
  const readings = vertices.map((vertex, index) => ({
    value: index + 1,
    up: normalize(vertex),
  }));
  const labels = faces.flatMap((face) => {
    const center = faceCenter(vertices, face);
    const normal = outwardNormal(vertices, face);
    const inradius = faceInradius(vertices, face, center);
    return face.map((vertexIndex): DieLabel => {
      const vertex = vertices[vertexIndex] ?? center;
      const toCorner = sub(vertex, center);
      return {
        text: labelText(kind, vertexIndex + 1),
        center: sub(vertex, scale(toCorner, 1 - CORNER_LABEL_ANCHOR)),
        normal,
        up: normalize(toCorner),
        halfSize: LABEL_FILL.corner * inradius,
      };
    });
  });
  return { readings, labels };
}

function isTrapezohedron(kind: DieKind): boolean {
  return kind === 'd10' || kind === 'd100-tens' || kind === 'd100-units';
}

function labelFillFor(kind: DieKind, sides: number): number {
  if (isTrapezohedron(kind)) return LABEL_FILL.kite;
  if (sides === TRIANGLE_SIDES) return LABEL_FILL.triangle;
  return sides === SQUARE_SIDES ? LABEL_FILL.square : LABEL_FILL.pentagon;
}

/** Um número por face; faces opostas somam o mesmo valor. */
function printFaces(kind: DieKind, solid: RawSolid): Printing {
  const { vertices, faces } = solid;
  const normals = faces.map((face) => outwardNormal(vertices, face));
  const values = valuesWithOppositePairs(normals, FACE_VALUES[kind]);

  const readings = faces.map((_, index) => ({
    value: values[index] ?? 0,
    up: normals[index] ?? ([0, 1, 0] as Vec3),
  }));

  const labels = faces.map((face, index): DieLabel => {
    const normal = normals[index] ?? [0, 1, 0];
    const first = vertices[face[0] ?? 0] ?? ORIGIN;
    // Na pipa do d10 o número fica mais perto da ponta, onde a face é mais larga.
    const tail = vertices[face[2] ?? 0] ?? first;
    const center = isTrapezohedron(kind)
      ? sub(first, scale(sub(first, tail), KITE_LABEL_ANCHOR))
      : faceCenter(vertices, face);
    return {
      text: labelText(kind, values[index] ?? 0),
      center,
      normal,
      up: normalize(sub(first, center)),
      halfSize: labelFillFor(kind, face.length) * faceInradius(vertices, face, center),
    };
  });
  return { readings, labels };
}

function buildShape(kind: DieKind): DieShape {
  const solid = rawSolidFor(kind);
  const { readings, labels } =
    kind === 'd4' ? printTetrahedron(kind, solid) : printFaces(kind, solid);
  return { kind, vertices: solid.vertices, faces: solid.faces, readings, labels };
}

const shapes = new Map<DieKind, DieShape>();

/** A forma de cada tipo de dado, montada uma vez só. */
export function getDieShape(kind: DieKind): DieShape {
  const cached = shapes.get(kind);
  if (cached) return cached;
  const built = buildShape(kind);
  shapes.set(kind, built);
  return built;
}

/** Todos os textos impressos em algum dado (para montar a textura dos números). */
export function allLabelTexts(): string[] {
  const texts = new Set<string>();
  for (const kind of DIE_KINDS) {
    for (const label of getDieShape(kind).labels) texts.add(label.text);
  }
  return [...texts];
}
