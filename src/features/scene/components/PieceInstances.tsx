import { useLayoutEffect, useRef } from 'react';
import {
  Color,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
} from 'three';
import { getGhostMaterial, type PieceLayer } from '../catalog/piece-geometry';
import { instanceCapacity, type InstanceTransform } from '../layout';

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

function writeTransforms(mesh: InstancedMesh, transforms: readonly InstanceTransform[]): void {
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

function writeColors(mesh: InstancedMesh, colors: readonly string[]): void {
  colors.forEach((color, index) => mesh.setColorAt(index, scratch.color.set(color)));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export type InstancedLayerProps = {
  geometry: BufferGeometry;
  material: Material;
  transforms: readonly InstanceTransform[];
  /** Cor por instância (ex: lateral do chão, que muda conforme o tipo de piso). */
  colors?: readonly string[];
  shadows?: boolean;
};

/** Uma camada de peça desenhada N vezes numa só chamada de desenho. */
export function InstancedLayer({
  geometry,
  material,
  transforms,
  colors,
  shadows = true,
}: InstancedLayerProps) {
  const ref = useRef<InstancedMesh>(null);
  const capacity = instanceCapacity(transforms.length);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    writeTransforms(mesh, transforms);
    if (colors) writeColors(mesh, colors);
    mesh.count = transforms.length;
    // Sem recalcular, o recorte de câmera usaria o volume antigo e sumiria com peças novas.
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
  }, [transforms, colors, capacity]);

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[geometry, material, capacity]}
      castShadow={shadows}
      receiveShadow
      // Geometria e material são compartilhados pelo catálogo; não podem ser descartados aqui.
      dispose={null}
    />
  );
}

export type PieceInstancesProps = {
  layers: readonly PieceLayer[];
  transforms: readonly InstanceTransform[];
  ghost?: boolean;
};

/** Todas as camadas de uma peça (ex: tocha = madeira + chama) com as mesmas posições. */
export function PieceInstances({ layers, transforms, ghost = false }: PieceInstancesProps) {
  if (transforms.length === 0) return null;
  return (
    <>
      {layers.map((layer, index) => (
        <InstancedLayer
          key={index}
          geometry={layer.geometry}
          material={ghost ? getGhostMaterial(layer.material) : layer.material}
          transforms={transforms}
          shadows={!ghost}
        />
      ))}
    </>
  );
}
