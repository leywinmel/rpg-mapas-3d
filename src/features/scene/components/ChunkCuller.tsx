import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Frustum, Matrix4 } from 'three';
import { chunkDetail, chunkLayers, type FrustumPlane } from '../chunks/chunk-culling';
import { useQualitySettings } from '../quality/quality-store';
import type { ChunkRegistry } from './ChunkView';

type ChunkCullerProps = {
  registry: ChunkRegistry;
  /** Além disto nada aparece (o fim da neblina). */
  maxDistance: number;
};

/**
 * Recorte por pedaço, a cada quadro: liga e desliga os grupos direto no three, sem passar
 * pelo React (nenhum pedaço redesenha por causa da câmera; só o primeiro "perto" de cada um
 * monta o desenho detalhado). Custa seis planos por pedaço, no máximo 1024 pedaços.
 */
export function ChunkCuller({ registry, maxDistance }: ChunkCullerProps) {
  const { detailDistance } = useQualitySettings();
  const [frustum] = useState(() => new Frustum());
  const [matrix] = useState(() => new Matrix4());

  useFrame(({ camera }) => {
    // Os controles mexem a câmera neste mesmo quadro; a matriz do mundo ainda é a do anterior.
    camera.updateMatrixWorld();
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(matrix);
    const planes: FrustumPlane[] = frustum.planes.map((plane) => ({
      x: plane.normal.x,
      y: plane.normal.y,
      z: plane.normal.z,
      constant: plane.constant,
    }));
    const view = { planes, eye: camera.position, maxDistance, detailDistance };
    for (const handle of registry.values()) {
      const detail = chunkDetail(handle.box, view);
      if (detail === 'full') handle.mountNear();
      const layers = chunkLayers(detail, handle.isNearReady());
      handle.root.visible = layers.root;
      handle.near.visible = layers.near;
      handle.far.visible = layers.far;
    }
  });

  return null;
}
