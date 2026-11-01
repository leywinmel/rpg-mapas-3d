import { BufferGeometry, EdgesGeometry, Float32BufferAttribute } from 'three';
import { getDieShape, type DieKind } from '../../physics/shapes';
import { cross, normalize, scale, sub, add, type Vec3 } from '../../physics/vec';
import { labelRect } from './label-atlas';

/** O número fica um tiquinho acima da face para não brigar com ela na hora de desenhar. */
const LABEL_LIFT = 0.006;
/** Ângulo (graus) a partir do qual a quina entra no contorno do dado. */
const EDGE_THRESHOLD_DEGREES = 1;

export type DieGeometries = {
  body: BufferGeometry;
  edges: EdgesGeometry;
  labels: BufferGeometry;
};

function pushVec(target: number[], vector: Vec3): void {
  target.push(vector[0], vector[1], vector[2]);
}

/** Faces planas, cada uma com a própria normal: é isso que dá o ar facetado. */
function buildBody(kind: DieKind): BufferGeometry {
  const { vertices, faces } = getDieShape(kind);
  const positions: number[] = [];
  const normals: number[] = [];

  for (const face of faces) {
    const points = face.map((index) => vertices[index]).filter((p): p is Vec3 => p !== undefined);
    const [first, second, third] = points;
    if (!first || !second || !third) continue;
    // O sólido é centrado na origem e as faces são anti-horárias vistas de fora.
    const normal = normalize(cross(sub(second, first), sub(third, second)));
    for (let index = 1; index < points.length - 1; index++) {
      const a = points[index];
      const b = points[index + 1];
      if (!a || !b) continue;
      for (const point of [first, a, b]) {
        pushVec(positions, point);
        pushVec(normals, normal);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  return geometry;
}

/** Um quadrado por número, deitado sobre a face e apontando o topo para onde o número "sobe". */
function buildLabels(kind: DieKind): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (const label of getDieShape(kind).labels) {
    const right = scale(cross(label.up, label.normal), label.halfSize);
    const up = scale(label.up, label.halfSize);
    const origin = add(label.center, scale(label.normal, LABEL_LIFT));
    const corner = (x: -1 | 1, y: -1 | 1): Vec3 => add(add(origin, scale(right, x)), scale(up, y));
    const { u0, v0, u1, v1 } = labelRect(label.text);

    const quad: Array<{ point: Vec3; u: number; v: number }> = [
      { point: corner(-1, -1), u: u0, v: v0 },
      { point: corner(1, -1), u: u1, v: v0 },
      { point: corner(1, 1), u: u1, v: v1 },
      { point: corner(-1, 1), u: u0, v: v1 },
    ];
    // Dois triângulos: (0, 1, 2) e (0, 2, 3).
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const vertex = quad[index];
      if (!vertex) continue;
      pushVec(positions, vertex.point);
      pushVec(normals, label.normal);
      uvs.push(vertex.u, vertex.v);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  return geometry;
}

const cache = new Map<DieKind, DieGeometries>();

/** Malhas do dado (corpo, contorno e números), montadas uma vez por tipo e reaproveitadas. */
export function getDieGeometries(kind: DieKind): DieGeometries {
  const cached = cache.get(kind);
  if (cached) return cached;
  const body = buildBody(kind);
  const built = {
    body,
    edges: new EdgesGeometry(body, EDGE_THRESHOLD_DEGREES),
    labels: buildLabels(kind),
  };
  cache.set(kind, built);
  return built;
}
