import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Matrix4, Quaternion, type InstancedMesh } from 'three';
import { INTERACTION_SECONDS, type InteractiveModel } from '../catalog/interactive-models';
import type { PieceLayer } from '../catalog/piece-geometry';
import { splitModel, type SplitPart } from '../catalog/split-model';
import type { PieceState } from '../chunks/chunk-instances';
import { transformMatrix, writeColors } from '../chunks/instance-matrices';
import { instanceCapacity, type InstanceTransform } from '../layout';
import { PieceInstances } from './PieceInstances';

type Placement = {
  transforms: readonly InstanceTransform[];
  states: readonly PieceState[];
  tint?: string;
};

/** Começa e termina devagar: a porta não dá tranco no batente. */
const ease = (progress: number) => progress * progress * (3 - 2 * progress);

// Reaproveitados a cada quadro: abrir dez portas não gera lixo para o coletor.
const scratch = {
  base: new Matrix4(),
  hinge: new Matrix4(),
  turn: new Matrix4(),
  back: new Matrix4(),
  rotation: new Quaternion(),
  identity: new Quaternion(),
};

/** A parte que mexe, com o quanto cada cópia está aberta (0 a 1) animado a cada quadro. */
function PartInstances({ part, transforms, states, tint }: Placement & { part: SplitPart }) {
  const meshes = useRef<Array<InstancedMesh | null>>([]);
  const progress = useRef(new Map<string, number>());
  const capacity = instanceCapacity(transforms.length);
  const open = useMemo(() => new Quaternion().setFromEuler(part.turn), [part]);

  const write = () => {
    transforms.forEach((transform, index) => {
      const amount = ease(progress.current.get(states[index]?.id ?? '') ?? 0);
      scratch.rotation.slerpQuaternions(scratch.identity, open, amount);
      scratch.hinge.makeTranslation(part.pivot.x, part.pivot.y, part.pivot.z);
      scratch.turn.makeRotationFromQuaternion(scratch.rotation);
      scratch.back.makeTranslation(-part.pivot.x, -part.pivot.y, -part.pivot.z);
      transformMatrix(transform, scratch.base)
        .multiply(scratch.hinge)
        .multiply(scratch.turn)
        .multiply(scratch.back);
      for (const mesh of meshes.current) mesh?.setMatrixAt(index, scratch.base);
    });
    for (const mesh of meshes.current) {
      if (!mesh) continue;
      mesh.count = transforms.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  };

  useLayoutEffect(() => {
    // Peça que acabou de chegar (mapa aberto agora, peça nova) já entra parada no estado dela;
    // só a que muda de estado depois anima.
    const known = progress.current;
    const next = new Map<string, number>();
    for (const state of states) next.set(state.id, known.get(state.id) ?? (state.open ? 1 : 0));
    progress.current = next;
    write();
    if (tint) {
      const colors = transforms.map(() => tint);
      for (const mesh of meshes.current) if (mesh) writeColors(mesh, colors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- write lê os mesmos valores
  }, [transforms, states, tint, capacity]);

  useFrame((_, delta) => {
    const step = delta / INTERACTION_SECONDS;
    let moving = false;
    for (const state of states) {
      const current = progress.current.get(state.id) ?? 0;
      const target = state.open ? 1 : 0;
      if (current === target) continue;
      const next =
        current < target ? Math.min(target, current + step) : Math.max(target, current - step);
      progress.current.set(state.id, next);
      moving = true;
    }
    if (moving) write();
  });

  return (
    <>
      {part.layers.map((layer, index) => (
        <instancedMesh
          key={`${capacity}-${index}`}
          ref={(mesh) => {
            meshes.current[index] = mesh;
          }}
          args={[layer.geometry, layer.material, capacity]}
          castShadow
          receiveShadow
          // A parte gira para fora da caixa da peça; o pedaço inteiro já é recortado de longe.
          frustumCulled={false}
          dispose={null}
        />
      ))}
    </>
  );
}

/** Peça com interação: o resto parado como sempre e cada parte que mexe por cima. */
export function InteractiveInstances({
  layers,
  model,
  transforms,
  states,
  tint,
}: Placement & { layers: readonly PieceLayer[]; model: InteractiveModel }) {
  const split = useMemo(() => splitModel(layers, model), [layers, model]);
  if (transforms.length === 0) return null;
  return (
    <>
      <PieceInstances layers={split.rest} transforms={transforms} tint={tint} />
      {split.parts.map((part, index) => (
        <PartInstances
          key={index}
          part={part}
          transforms={transforms}
          states={states}
          tint={tint}
        />
      ))}
    </>
  );
}
