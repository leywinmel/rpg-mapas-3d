/**
 * Recorta o modelo de uma peça com interação (RPG-44) nas partes que mexem e no resto, que
 * fica parado. O triângulo vai para a parte cuja caixa contém o centro dele; os da caixa de
 * remover somem (o vão da porta). As folhas e o miolo escuro entram como camadas novas.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Euler,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { InteractiveModel, ModelBox } from './interactive-models';
import type { PieceLayer } from './piece-geometry';

/** O fundo do baú e da carroceria: escuro, mas não preto, para ainda ler a forma. */
export const INTERIOR_COLOR = '#1d1d22';

export type SplitPart = {
  readonly layers: PieceLayer[];
  readonly pivot: Vector3;
  readonly turn: Euler;
};

export type SplitModel = { readonly rest: PieceLayer[]; readonly parts: SplitPart[] };

const VERTICES_PER_TRIANGLE = 3;
const REMOVED = -2;
const STILL = -1;

const inside = (box: ModelBox, point: Vector3) =>
  point.x >= box.min[0] &&
  point.x <= box.max[0] &&
  point.y >= box.min[1] &&
  point.y <= box.max[1] &&
  point.z >= box.min[2] &&
  point.z <= box.max[2];

function classify(model: InteractiveModel, centroid: Vector3): number {
  if (model.remove?.some((box) => inside(box, centroid))) return REMOVED;
  const part = model.parts.findIndex((each) => each.select?.some((box) => inside(box, centroid)));
  return part >= 0 ? part : STILL;
}

/** Só os triângulos da lista, com todos os atributos (posição, normal, uv, cor). */
function pickTriangles(source: BufferGeometry, triangles: readonly number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const { itemSize } = attribute;
    const values = new Float32Array(triangles.length * VERTICES_PER_TRIANGLE * itemSize);
    triangles.forEach((first, index) => {
      for (let corner = 0; corner < VERTICES_PER_TRIANGLE; corner += 1) {
        for (let component = 0; component < itemSize; component += 1) {
          values[(index * VERTICES_PER_TRIANGLE + corner) * itemSize + component] =
            attribute.getComponent(first + corner, component);
        }
      }
    });
    geometry.setAttribute(name, new BufferAttribute(values, itemSize));
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function boxGeometry(box: ModelBox): BufferGeometry {
  const size = box.max.map((value, axis) => value - box.min[axis]!);
  const center = box.max.map((value, axis) => (value + box.min[axis]!) / 2);
  return new BoxGeometry(size[0], size[1], size[2]).translate(center[0]!, center[1]!, center[2]!);
}

export function splitModel(layers: readonly PieceLayer[], model: InteractiveModel): SplitModel {
  const rest: PieceLayer[] = [];
  const parts: SplitPart[] = model.parts.map((part) => ({
    layers: [],
    pivot: new Vector3(...part.pivot),
    turn: new Euler(...part.turn),
  }));
  const centroid = new Vector3();
  const corner = new Vector3();
  for (const layer of layers) {
    const source = layer.geometry.index ? layer.geometry.toNonIndexed() : layer.geometry;
    const position = source.getAttribute('position');
    const still: number[] = [];
    const moving: number[][] = model.parts.map(() => []);
    for (let first = 0; first < position.count; first += VERTICES_PER_TRIANGLE) {
      centroid.set(0, 0, 0);
      for (let offset = 0; offset < VERTICES_PER_TRIANGLE; offset += 1) {
        centroid.add(corner.fromBufferAttribute(position, first + offset));
      }
      const target = classify(model, centroid.divideScalar(VERTICES_PER_TRIANGLE));
      if (target === STILL) still.push(first);
      else if (target !== REMOVED) moving[target]!.push(first);
    }
    if (still.length > 0)
      rest.push({ geometry: pickTriangles(source, still), material: layer.material });
    moving.forEach((triangles, index) => {
      if (triangles.length === 0) return;
      parts[index]!.layers.push({
        geometry: pickTriangles(source, triangles),
        material: layer.material,
      });
    });
  }
  model.parts.forEach((part, index) => {
    if (!part.panel) return;
    const { material, box } = part.panel;
    const owner = layers.find((layer) => layer.material.name === material) ?? layers[0];
    if (owner) parts[index]!.layers.push({ geometry: boxGeometry(box), material: owner.material });
  });
  if (model.interior) {
    rest.push({
      geometry: boxGeometry(model.interior),
      material: new MeshStandardMaterial({ color: INTERIOR_COLOR, roughness: 1 }),
    });
  }
  return { rest, parts };
}
