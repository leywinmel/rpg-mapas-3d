import { useCallback, useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { MOUSE } from 'three';
import type { GridSize } from '@/domain';
import { cameraFrame, clampToBoard } from '../layout';

/** "view": botão esquerdo gira a câmera. "edit": o esquerdo fica livre para pintar. */
export type CameraMode = 'view' | 'edit';

const VIEW_BUTTONS = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
const EDIT_BUTTONS = { MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE };
/** Nunca deita até o horizonte (veria por baixo do diorama) nem fica a pino. */
const MIN_POLAR = 0.15;
const MAX_POLAR = 1.35;
const DAMPING = 0.12;

type Controls = ComponentRef<typeof OrbitControls>;

export function CameraRig({ size, mode }: { size: GridSize; mode: CameraMode }) {
  const controls = useRef<Controls>(null);
  const { width, depth } = size;
  const frame = useMemo(() => cameraFrame({ width, depth }), [width, depth]);

  // Trocar de mapa reenquadra a câmera no novo tamanho.
  useLayoutEffect(() => {
    const current = controls.current;
    if (!current) return;
    current.object.position.set(frame.position.x, frame.position.y, frame.position.z);
    current.target.set(frame.target.x, frame.target.y, frame.target.z);
    // Mapa grande pede um fundo de câmera mais longe; sem isto a ponta do mapa some.
    if (current.object.far !== frame.far) {
      current.object.far = frame.far;
      current.object.updateProjectionMatrix();
    }
    current.update();
  }, [frame]);

  const keepOnBoard = useCallback(() => {
    const current = controls.current;
    if (!current) return;
    const clamped = clampToBoard(current.target, { width, depth });
    const dx = clamped.x - current.target.x;
    const dz = clamped.z - current.target.z;
    if (dx === 0 && dz === 0) return;
    // Move câmera e alvo juntos: só o alvo daria um tranco no ângulo.
    current.target.set(clamped.x, clamped.y, clamped.z);
    current.object.position.x += dx;
    current.object.position.z += dz;
  }, [width, depth]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={DAMPING}
      screenSpacePanning={false}
      minDistance={frame.minDistance}
      maxDistance={frame.maxDistance}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      mouseButtons={mode === 'edit' ? EDIT_BUTTONS : VIEW_BUTTONS}
      onChange={keepOnBoard}
    />
  );
}
