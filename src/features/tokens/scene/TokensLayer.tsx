import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { RingGeometry, type Group } from 'three';
import { anchorUnderCursor, canMoveToken, type Cell } from '@/domain';
import { isPieceVisible } from '@/domain/map-v2';
import { useRoomSession } from '@/features/rooms';
import { modelHeightMap, pickCell, SCENE_UI_USER_DATA, type HeightMap } from '@/features/scene';
import { useTokensStore } from '../hooks/tokens-store';
import type { Token } from '../types';
import { TokenLabel } from './TokenLabel';
import { TokenModel } from './TokenModel';
import {
  TOKEN_CLICK_TOLERANCE_PX,
  TOKEN_GLIDE_PER_SECOND,
  TOKEN_SCENE_COLORS,
  TOKEN_SHAPE,
  tokenWorldPosition,
} from './token-scene';

/** Plano invisível do arraste, bem maior que o mapa: soltar perto da borda ainda acha a casa. */
const DRAG_PLANE_MARGIN = 200;
const RING_LIFT = 0.02;
/** Um fio acima do plano do editor: no arraste, o movimento é do token, não do pincel. */
const DRAG_PLANE_LIFT = 0.01;
const EMPTY_HEIGHTS: HeightMap = { size: { width: 0, depth: 0 }, lookup: () => 0 };

const ringGeometry = new RingGeometry(
  TOKEN_SHAPE.selectionInner,
  TOKEN_SHAPE.selectionOuter,
  32,
).rotateX(-Math.PI / 2);

type Toggleable = { enabled: boolean };

function isToggleable(value: unknown): value is Toggleable {
  return typeof value === 'object' && value !== null && 'enabled' in value;
}

/** A câmera não gira enquanto um token é arrastado com o botão esquerdo. */
function useCameraLock() {
  const getState = useThree((state) => state.get);
  return (locked: boolean) => {
    // Lido na hora: os controles da câmera são do three, não estado do React.
    const { controls } = getState();
    if (isToggleable(controls)) controls.enabled = !locked;
  };
}

type PieceProps = {
  token: Token;
  anchor: Cell;
  selected: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>, token: Token) => void;
};

/** Um token na mesa. Anda deslizando até a casa nova (o arraste dos outros chega aos saltos). */
function TokenPiece({ token, anchor, selected, onPointerDown }: PieceProps) {
  const group = useRef<Group>(null);
  const target = tokenWorldPosition(anchor, token.size, token.level);
  const placed = useRef(false);

  useFrame((_, delta) => {
    const current = group.current;
    if (!current) return;
    if (!placed.current) {
      current.position.set(target.x, target.y, target.z);
      placed.current = true;
      return;
    }
    const step = Math.min(1, delta * TOKEN_GLIDE_PER_SECOND);
    current.position.x += (target.x - current.position.x) * step;
    current.position.y += (target.y - current.position.y) * step;
    current.position.z += (target.z - current.position.z) * step;
  });

  const scale = token.size;
  const labelHeight = (TOKEN_SHAPE.cardHeight + TOKEN_SHAPE.labelGap) * scale;
  return (
    <group ref={group} onPointerDown={(event) => onPointerDown(event, token)}>
      <group scale={scale}>
        <TokenModel token={token} transparent={token.hidden} />
      </group>
      {selected && (
        <mesh
          geometry={ringGeometry}
          position={[0, RING_LIFT, 0]}
          scale={scale}
          userData={SCENE_UI_USER_DATA}
          dispose={null}
        >
          <meshBasicMaterial color={TOKEN_SCENE_COLORS.selection} transparent depthWrite={false} />
        </mesh>
      )}
      <TokenLabel token={token} height={labelHeight} />
    </group>
  );
}

type Drag = { token: Token; anchor: Cell; startX: number; startY: number; moved: boolean };

function useDrag(heights: HeightMap) {
  const lockCamera = useCameraLock();
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const update = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  // Soltar fora do canvas também termina o arraste (senão o token ficaria "grudado").
  useEffect(() => {
    if (!drag) return;
    const finish = () => {
      const current = dragRef.current;
      update(null);
      lockCamera(false);
      if (!current?.moved) return;
      const { token, anchor } = current;
      if (anchor.x === token.x && anchor.z === token.z) return;
      void useTokensStore.getState().actions?.dropToken(token, anchor);
    };
    window.addEventListener('pointerup', finish);
    window.addEventListener('blur', finish);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('blur', finish);
    };
    // Só a presença do arraste importa: o resto é lido do ref na hora de soltar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const start = (event: ThreeEvent<PointerEvent>, token: Token) => {
    lockCamera(true);
    update({
      token,
      anchor: { x: token.x, z: token.z },
      startX: event.nativeEvent.clientX,
      startY: event.nativeEvent.clientY,
      moved: false,
    });
  };

  const move = (event: ThreeEvent<PointerEvent>) => {
    const current = dragRef.current;
    if (!current) return;
    event.stopPropagation();
    const distance = Math.hypot(
      event.nativeEvent.clientX - current.startX,
      event.nativeEvent.clientY - current.startY,
    );
    if (!current.moved && distance <= TOKEN_CLICK_TOLERANCE_PX) return;
    const hit = pickCell(event.ray, heights);
    if (!hit) return;
    const anchor = anchorUnderCursor(heights.size, hit.cell, current.token.size);
    if (current.moved && anchor.x === current.anchor.x && anchor.z === current.anchor.z) return;
    update({ ...current, anchor, moved: true });
    useTokensStore.getState().actions?.dragToken(current.token, anchor);
  };

  return { drag, start, move };
}

/**
 * Tokens do mapa aberto na cena: desenha, seleciona e arrasta. O jogador só arrasta os
 * próprios; o mestre, todos (o banco confere de novo ao gravar).
 */
export default function TokensLayer() {
  const { viewer } = useRoomSession();
  const view = useTokensStore((state) => state.view);
  const tokens = useTokensStore((state) => state.tokens);
  const remoteDrags = useTokensStore((state) => state.remoteDrags);
  const selectedId = useTokensStore((state) => state.selectedId);
  const model = view?.model;
  const heights = useMemo(() => (model ? modelHeightMap(model) : null), [model]);
  const { drag, start, move } = useDrag(heights ?? EMPTY_HEIGHTS);

  if (!view || !heights) return null;
  const { width, depth } = view.model.size;

  const onTokenDown = (event: ThreeEvent<PointerEvent>, token: Token) => {
    if (event.button !== 0) return;
    // O token está na frente: o clique é dele, não do editor nem da câmera.
    event.stopPropagation();
    useTokensStore.getState().select(token.id);
    if (canMoveToken(viewer, token)) start(event, token);
  };

  return (
    <>
      {tokens
        .filter((token) => isPieceVisible(token, view.cutaway))
        .map((token) => (
          <TokenPiece
            key={token.id}
            token={token}
            anchor={drag?.token.id === token.id ? drag.anchor : (remoteDrags[token.id] ?? token)}
            selected={token.id === selectedId}
            onPointerDown={onTokenDown}
          />
        ))}
      {drag && (
        <mesh
          visible={false}
          rotation-x={-Math.PI / 2}
          position={[width / 2, DRAG_PLANE_LIFT, depth / 2]}
          onPointerMove={move}
        >
          <planeGeometry args={[width + DRAG_PLANE_MARGIN, depth + DRAG_PLANE_MARGIN]} />
        </mesh>
      )}
    </>
  );
}
