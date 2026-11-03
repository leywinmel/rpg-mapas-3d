import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type PointLight } from 'three';
import type { LightSource } from '../chunks/chunk-instances';

/**
 * Teto de luzes pontuais reais. Cada luz a mais pesa em TODO pixel de todo
 * material; acima disso as tochas continuam com a chama brilhante, mas só as
 * mais próximas do centro da câmera iluminam o chão.
 */
export const MAX_REAL_LIGHTS = 6;
/** De quanto em quanto tempo reescolhe as tochas acesas (não precisa ser todo quadro). */
const REASSIGN_INTERVAL_S = 0.3;
const FLICKER_SPEED = 9;
const FLICKER_AMOUNT = 0.12;
/** Defasagem entre tochas vizinhas, para não piscarem em uníssono. */
const FLICKER_PHASE_STEP = 1.7;

type Flame = {
  position: Vector3;
  color: string;
  intensity: number;
  distance: number;
  phase: number;
};

function toFlames(sources: readonly LightSource[]): Flame[] {
  return sources.map((source, index) => ({
    position: new Vector3(source.x, source.y, source.z),
    color: source.color,
    intensity: source.intensity,
    distance: source.distance,
    phase: index * FLICKER_PHASE_STEP,
  }));
}

function hasTarget(value: unknown): value is { target: Vector3 } {
  return typeof value === 'object' && value !== null && 'target' in value;
}

/**
 * Sempre as mesmas MAX_REAL_LIGHTS luzes montadas (as sobrando ficam com
 * intensidade 0): mudar a quantidade de luzes faria o three.js recompilar todos
 * os shaders, um engasgo visível a cada tocha colocada.
 */
export function TorchLights({ sources }: { sources: readonly LightSource[] }) {
  const flames = useMemo(() => toFlames(sources), [sources]);
  const lights = useRef<Array<PointLight | null>>([]);
  const assigned = useRef<Flame[]>([]);
  const sinceReassign = useRef(Infinity);
  const controls = useThree((state) => state.controls);

  useFrame((state, delta) => {
    sinceReassign.current += delta;
    if (sinceReassign.current >= REASSIGN_INTERVAL_S) {
      sinceReassign.current = 0;
      const focus = hasTarget(controls) ? controls.target : state.camera.position;
      assigned.current = [...flames]
        .sort((a, b) => a.position.distanceToSquared(focus) - b.position.distanceToSquared(focus))
        .slice(0, MAX_REAL_LIGHTS);
    }
    const time = state.clock.elapsedTime;
    lights.current.forEach((light, index) => {
      if (!light) return;
      const source = assigned.current[index];
      if (!source) {
        light.intensity = 0;
        return;
      }
      light.position.copy(source.position);
      light.color.set(source.color);
      light.distance = source.distance;
      const flicker = 1 + Math.sin(time * FLICKER_SPEED + source.phase) * FLICKER_AMOUNT;
      light.intensity = source.intensity * flicker;
    });
  });

  return (
    <>
      {Array.from({ length: MAX_REAL_LIGHTS }, (_, index) => (
        <pointLight
          key={index}
          ref={(light) => {
            lights.current[index] = light;
          }}
          intensity={0}
          decay={2}
        />
      ))}
    </>
  );
}
