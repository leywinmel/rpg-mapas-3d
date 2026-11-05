import { useLayoutEffect, useRef } from 'react';
import type { BufferGeometry, InstancedMesh, Material } from 'three';
import { getGhostMaterial, type PieceLayer } from '../catalog/piece-geometry';
import { writeColors, writeTransforms } from '../chunks/instance-matrices';
import { instanceCapacity, type InstanceTransform } from '../layout';

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
          // Vidro é translúcido: com sombra cheia, a janela escurecia o chão como uma parede.
          shadows={!ghost && !layer.material.transparent}
        />
      ))}
    </>
  );
}
