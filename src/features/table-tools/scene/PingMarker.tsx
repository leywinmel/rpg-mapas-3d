import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CylinderGeometry, RingGeometry, type Mesh, type MeshBasicMaterial } from 'three';
import { SCENE_UI_USER_DATA, type HeightMap } from '@/features/scene';
import { PING_LIFETIME_MS } from '../constants';
import type { Ping } from '../hooks/table-tools-store';
import { cellTop, PING_SHAPE, TABLE_SCENE_COLORS } from './table-tools-scene';
import styles from './table-tools-scene.module.css';

const MS_PER_SECOND = 1000;
const RING_SEGMENTS = 40;
const BEAM_SEGMENTS = 8;
const LABEL_Z_RANGE = [10, 0];
/** Com movimento reduzido, o anel fica parado no meio do caminho e só apaga. */
const STILL_WAVE = 0.5;

const ringGeometry = new RingGeometry(
  PING_SHAPE.ringInner,
  PING_SHAPE.ringOuter,
  RING_SEGMENTS,
).rotateX(-Math.PI / 2);
const beamGeometry = new CylinderGeometry(
  PING_SHAPE.beamRadius,
  PING_SHAPE.beamRadius,
  PING_SHAPE.beamHeight,
  BEAM_SEGMENTS,
).translate(0, PING_SHAPE.beamHeight / 2, 0);

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Marcador animado: um anel que cresce em ondas e um feixe de luz que some. Fica na casa
 * marcada, em cima do chão que esta pessoa enxerga (sob a névoa, o chão liso): o ping não
 * conta nada do que a névoa esconde.
 */
export function PingMarker({
  ping,
  heights,
  who,
}: {
  ping: Ping;
  heights: HeightMap;
  who: string;
}) {
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const beamMaterial = useRef<MeshBasicMaterial>(null);
  const age = useRef(0);
  const at = cellTop(heights, ping.cell, PING_SHAPE.lift);

  useFrame((_, delta) => {
    age.current += delta * MS_PER_SECOND;
    const life = Math.min(1, age.current / PING_LIFETIME_MS);
    const fade = 1 - life;
    const wave = reducedMotion ? STILL_WAVE : (life * PING_SHAPE.waves) % 1;
    const scale = 1 + wave * (PING_SHAPE.growTo - 1);
    ring.current?.scale.setScalar(scale);
    if (ringMaterial.current) {
      ringMaterial.current.opacity = fade * (1 - wave * PING_SHAPE.waveFade);
    }
    if (beamMaterial.current) beamMaterial.current.opacity = fade * PING_SHAPE.beamOpacity;
  });

  return (
    <group position={[at.x, at.y, at.z]} userData={SCENE_UI_USER_DATA}>
      <mesh ref={ring} geometry={ringGeometry} renderOrder={2} dispose={null}>
        <meshBasicMaterial
          ref={ringMaterial}
          color={TABLE_SCENE_COLORS.ping}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={beamGeometry} renderOrder={2} dispose={null}>
        <meshBasicMaterial
          ref={beamMaterial}
          color={TABLE_SCENE_COLORS.ping}
          transparent
          depthWrite={false}
        />
      </mesh>
      <Html
        position={[0, PING_SHAPE.labelHeight + PING_SHAPE.beamHeight, 0]}
        center
        zIndexRange={LABEL_Z_RANGE}
        pointerEvents="none"
      >
        <div className={styles.label} data-scene-label>
          <span className={styles.distance}>{who}</span>
        </div>
      </Html>
    </group>
  );
}
