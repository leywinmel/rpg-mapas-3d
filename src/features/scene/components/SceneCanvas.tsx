import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Ambience, GridSize, MapDocument } from '@/domain';
import { cx } from '@/lib/cx';
import { fogRange } from '../ambience';
import { cameraFrame } from '../layout';
import type { ModelUrls } from './AssetPieces';
import { CameraRig, type CameraMode } from './CameraRig';
import { MapRenderer } from './MapRenderer';
import { PerfMeter, type PerfSample } from './PerfMeter';
import { SceneLights } from './SceneLights';

/** Telas de alta densidade a 1,5×: acima disso o custo sobe muito e o low-poly não ganha nada. */
const MAX_PIXEL_RATIO = 1.5;
const CAMERA_FOV = 45;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;

export type SceneCanvasProps = {
  size: GridSize;
  ambience: Ambience;
  mode?: CameraMode;
  onPerfSample?: (sample: PerfSample) => void;
  className?: string;
  /** Nome da cena para o leitor de tela. */
  label?: string;
  children?: ReactNode;
};

/** Palco 3D: câmera orbital com limites, luz baixa e quente, neblina na cor da ambientação. */
export function SceneCanvas({
  size,
  ambience,
  mode = 'view',
  onPerfSample,
  className,
  label = 'Mapa 3D',
  children,
}: SceneCanvasProps) {
  const fog = fogRange(ambience, Math.max(size.width, size.depth));
  const { position } = cameraFrame(size);
  return (
    <Canvas
      className={cx('scene', className)}
      aria-label={label}
      role="img"
      shadows
      dpr={[1, MAX_PIXEL_RATIO]}
      camera={{
        position: [position.x, position.y, position.z],
        fov: CAMERA_FOV,
        near: CAMERA_NEAR,
        far: CAMERA_FAR,
      }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[ambience.fogColor]} />
      <fog attach="fog" args={[ambience.fogColor, fog.near, fog.far]} />
      <SceneLights ambience={ambience} size={size} />
      <CameraRig size={size} mode={mode} />
      {children}
      {onPerfSample && <PerfMeter onSample={onPerfSample} />}
    </Canvas>
  );
}

export type MapSceneProps = Omit<SceneCanvasProps, 'ambience'> & {
  document: MapDocument;
  modelUrls?: ModelUrls;
  showGrid?: boolean;
};

/** Cena pronta de um mapa: o palco mais o diorama do documento. */
export function MapScene({ document, modelUrls, showGrid, children, ...canvas }: MapSceneProps) {
  return (
    <SceneCanvas {...canvas} ambience={document.ambience}>
      <MapRenderer
        document={document}
        size={canvas.size}
        modelUrls={modelUrls}
        showGrid={showGrid}
      />
      {children}
    </SceneCanvas>
  );
}
