import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { bakeModel } from './model-layers';

const INT16_MAX = 32767;

/** Malha como os pacotes guardam: posição em inteiros de -1 a 1 e o tamanho real na escala do nó. */
function quantizedWall(): Group {
  const geometry = new BufferGeometry();
  const unit = [-1, -1, 0, 1, -1, 0, 1, 1, 0];
  geometry.setAttribute(
    'position',
    new BufferAttribute(
      Int16Array.from(unit, (value) => value * INT16_MAX),
      3,
      true,
    ),
  );
  const mesh = new Mesh(geometry, new MeshStandardMaterial());
  mesh.position.set(0, 1, 0);
  mesh.scale.set(1, 1, 1);
  const root = new Group();
  root.add(mesh);
  return root;
}

describe('bakeModel', () => {
  it('shouldKeepTheFullHeightOfACompressedModel', () => {
    const [layer] = bakeModel(quantizedWall(), { fitToCell: false });
    layer!.geometry.computeBoundingBox();
    const box = layer!.geometry.boundingBox!;
    expect(box.min.y).toBeCloseTo(0, 3);
    // Antes, o topo (y = 2) estourava o inteiro e a parede saía cortada.
    expect(box.max.y).toBeCloseTo(2, 3);
    expect(layer!.geometry.getAttribute('position').array).toBeInstanceOf(Float32Array);
  });

  it('shouldLeaveTheOriginalGeometryUntouched', () => {
    const root = quantizedWall();
    const original = (root.children[0] as Mesh).geometry.getAttribute('position');
    bakeModel(root, { fitToCell: false });
    expect(original.array).toBeInstanceOf(Int16Array);
    expect(original.getY(2)).toBeCloseTo(1, 3);
  });
});
