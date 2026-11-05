import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { isPieceVisible } from '@/domain/map-v2';
import type { InstanceTransform } from '@/features/scene';
import { AssetPieces, type ModelUrls } from '@/features/scene/components/AssetPieces';
import { useTokensStore } from '@/features/tokens';
import { useSceneryStore } from '../hooks/scenery-store';
import { poseAt } from '../services/scenery-runtime';
import type { SceneryGlide } from '../types';

const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * Uma peça deslizando: o modelo fica parado na origem de um grupo, e é o grupo que anda e gira
 * a cada quadro. Assim o InstancedMesh da peça é montado uma vez só, e não 60 vezes por segundo.
 */
function GlidingPiece({ glide, modelUrls }: { glide: SceneryGlide; modelUrls?: ModelUrls }) {
  const group = useRef<Group>(null);
  const { scale } = glide.piece;
  const transforms = useMemo<InstanceTransform[]>(
    () => [{ x: 0, y: 0, z: 0, rotationY: 0, scale }],
    [scale],
  );

  useFrame(() => {
    const current = group.current;
    if (!current) return;
    const pose = poseAt(glide, performance.now());
    current.position.set(pose.x, pose.y, pose.z);
    current.rotation.y = pose.rotationY * DEGREES_TO_RADIANS;
  });

  const start = glide.from;
  return (
    <group
      ref={group}
      position={[start.x, start.y, start.z]}
      rotation-y={start.rotationY * DEGREES_TO_RADIANS}
    >
      <AssetPieces asset={glide.piece.asset} transforms={transforms} modelUrls={modelUrls} />
    </group>
  );
}

/**
 * Carros e objetos soltos que o mestre acabou de mover, deslizando do lugar antigo ao novo.
 * Enquanto deslizam, o pedaço do mapa não os desenha (TableBinding.adjustModel tira a peça).
 */
export default function SceneryGlides() {
  const view = useTokensStore((state) => state.view);
  const glides = useSceneryStore((state) => state.glides);
  if (!view) return null;
  const moving = Object.values(glides).filter(
    (glide) =>
      glide.gliding && glide.mapId === view.mapId && isPieceVisible(glide.piece, view.cutaway),
  );
  return (
    <>
      {moving.map((glide) => (
        <GlidingPiece key={glide.serial} glide={glide} modelUrls={view.modelUrls} />
      ))}
    </>
  );
}
