/**
 * Escreve posições, giros, escalas e cores nas cópias de um InstancedMesh. Mora fora do
 * componente porque a exportação do .glb monta as mesmas malhas sem React.
 */
import { Color, Euler, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import type { InstanceTransform } from '../layout';

const DEGREES_TO_RADIANS = Math.PI / 180;

// Reaproveitados a cada escrita: montar 10 mil matrizes não gera lixo para o coletor.
const scratch = {
  matrix: new Matrix4(),
  position: new Vector3(),
  rotation: new Quaternion(),
  euler: new Euler(),
  scale: new Vector3(),
  color: new Color(),
};

export function writeTransforms(
  mesh: InstancedMesh,
  transforms: readonly InstanceTransform[],
): void {
  transforms.forEach((transform, index) => {
    scratch.position.set(transform.x, transform.y, transform.z);
    scratch.euler.set(0, transform.rotationY * DEGREES_TO_RADIANS, 0);
    scratch.rotation.setFromEuler(scratch.euler);
    scratch.scale.set(transform.scale, transform.scaleY ?? transform.scale, transform.scale);
    scratch.matrix.compose(scratch.position, scratch.rotation, scratch.scale);
    mesh.setMatrixAt(index, scratch.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

export function writeColors(mesh: InstancedMesh, colors: readonly string[]): void {
  colors.forEach((color, index) => mesh.setColorAt(index, scratch.color.set(color)));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
