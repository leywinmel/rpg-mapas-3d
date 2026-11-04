import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RingGeometry, type Mesh } from 'three';
import { isPieceVisible } from '@/domain/map-v2';
import { tokenWorldPosition, useTokensStore } from '@/features/tokens';
import { useCurrentTokenId } from '../hooks/initiative-store';

/**
 * Cor e medidas do destaque do token da vez. Como a paleta da cena, não segue o tema: a brasa da
 * vez tem a mesma cara no claro e no escuro. Fica por fora do anel de seleção do token.
 */
const TURN_COLOR = '#ff9a3c';
const TURN_RING = { inner: 0.54, outer: 0.64, lift: 0.04, pulse: 0.08, pulsePerSecond: 2.4 };
const RING_SEGMENTS = 48;

const ringGeometry = new RingGeometry(TURN_RING.inner, TURN_RING.outer, RING_SEGMENTS).rotateX(
  -Math.PI / 2,
);

// Quem pede menos movimento vê o anel parado.
const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Anel pulsando sob o token da vez. Só aparece se o token está na lista desta pessoa (o jogador
 * nem recebe o escondido), está neste mapa e não foi cortado pelo corte de andares.
 */
export default function CurrentTurnLayer() {
  const tokenId = useCurrentTokenId();
  const token = useTokensStore((state) => state.tokens.find((item) => item.id === tokenId) ?? null);
  const remote = useTokensStore((state) => (tokenId ? state.remoteDrags[tokenId] : undefined));
  const cutaway = useTokensStore((state) => state.view?.cutaway ?? null);
  const ring = useRef<Mesh>(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    if (reducedMotion || !ring.current) return;
    clock.current += delta;
    const pulse = 1 + Math.sin(clock.current * TURN_RING.pulsePerSecond) * TURN_RING.pulse;
    ring.current.scale.setScalar(pulse * (token?.size ?? 1));
  });

  if (!token || cutaway === null || !isPieceVisible(token, cutaway)) return null;
  const at = tokenWorldPosition(remote ?? token, token.size, token.level);
  return (
    <mesh
      ref={ring}
      geometry={ringGeometry}
      position={[at.x, at.y + TURN_RING.lift, at.z]}
      scale={token.size}
      renderOrder={1}
      dispose={null}
    >
      <meshBasicMaterial color={TURN_COLOR} transparent depthWrite={false} />
    </mesh>
  );
}
