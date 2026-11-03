import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Ambience, GridSize } from '@/domain';
import type { Cutaway, MapModel } from '@/domain/map-v2';
import { cx } from '@/lib/cx';
import { fogRange } from '../ambience';
import { cameraFrame } from '../layout';
import { useQualitySettings } from '../quality/quality-store';
import type { ModelUrls } from './AssetPieces';
import { CameraRig, type CameraMode } from './CameraRig';
import { MapRenderer } from './MapRenderer';
import { PerfMeter, type PerfSample } from './PerfMeter';
import { QualityMonitor } from './QualityMonitor';
import { SceneLights } from './SceneLights';

const MIN_PIXEL_RATIO = 1;
const CAMERA_FOV = 45;
const CAMERA_NEAR = 0.1;

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

/**
 * Palco 3D: câmera orbital com limites, luz baixa e quente, neblina na cor da ambientação. A
 * densidade de pixels e as sombras seguem o nível de qualidade, que o monitor ajusta sozinho
 * no modo automático.
 */
export function SceneCanvas({
  size,
  ambience,
  mode = 'view',
  onPerfSample,
  className,
  label = 'Mapa 3D',
  children,
}: SceneCanvasProps) {
  const { maxPixelRatio } = useQualitySettings();
  const fog = fogRange(ambience, Math.max(size.width, size.depth));
  const { position, far } = cameraFrame(size);
  return (
    <Canvas
      className={cx('scene', className)}
      aria-label={label}
      role="img"
      shadows
      dpr={[MIN_PIXEL_RATIO, maxPixelRatio]}
      camera={{
        position: [position.x, position.y, position.z],
        fov: CAMERA_FOV,
        near: CAMERA_NEAR,
        far,
      }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[ambience.fogColor]} />
      <fog attach="fog" args={[ambience.fogColor, fog.near, fog.far]} />
      <SceneLights ambience={ambience} size={size} />
      <CameraRig size={size} mode={mode} />
      <QualityMonitor />
      {children}
      {onPerfSample && <PerfMeter onSample={onPerfSample} />}
    </Canvas>
  );
}

export type MapSceneProps = Omit<SceneCanvasProps, 'ambience' | 'size'> & {
  model: MapModel;
  modelUrls?: ModelUrls;
  showGrid?: boolean;
  /** Corte de andares (degrau absoluto); sem ele, nada é escondido. */
  cutaway?: Cutaway;
};

/** Cena pronta de um mapa v2: o palco com o clima do mapa e o mapa desenhado em pedaços. */
export function MapScene({
  model,
  modelUrls,
  showGrid,
  cutaway,
  children,
  ...canvas
}: MapSceneProps) {
  return (
    <SceneCanvas {...canvas} size={model.size} ambience={model.header.ambience}>
      <MapRenderer model={model} cutaway={cutaway} modelUrls={modelUrls} showGrid={showGrid} />
      {children}
    </SceneCanvas>
  );
}
