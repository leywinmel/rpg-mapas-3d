import { useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { CurrentPlay } from '../hooks/tray-player';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { PlaybackDice } from './tray/PlaybackDice';
import { TrayScene } from './tray/TrayScene';

/** Câmera fixa, de cima e de frente, enquadrando a bandeja inteira. */
const CAMERA_POSITION: [number, number, number] = [0, 11, 5.1];
const CAMERA_TARGET: [number, number, number] = [0, 0, 0.2];
const CAMERA_FOV = 36;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 80;
const MAX_PIXEL_RATIO = 2;

/** Aponta a câmera para o meio da bandeja (o Canvas sozinho a deixa olhando para o horizonte). */
function CameraRig() {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    camera.lookAt(...CAMERA_TARGET);
    invalidate();
  }, [camera, invalidate]);
  return null;
}

export type TrayCanvasProps = {
  play: CurrentPlay | null;
  /** Valores da linha do banco, assim que ela chega. */
  expectedValues: readonly number[] | null;
};

/**
 * A bandeja 3D num Canvas só dela, separado da cena do mapa. Fica num arquivo próprio
 * (carregado sob demanda) para three.js e o resto não pesarem na carga da mesa.
 */
export default function TrayCanvas({ play, expectedValues }: TrayCanvasProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <Canvas
      frameloop="demand"
      shadows="percentage"
      dpr={[1, MAX_PIXEL_RATIO]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV, near: CAMERA_NEAR, far: CAMERA_FAR }}
    >
      <CameraRig />
      <TrayScene />
      {play && (
        <PlaybackDice play={play} expectedValues={expectedValues} reducedMotion={reducedMotion} />
      )}
    </Canvas>
  );
}
