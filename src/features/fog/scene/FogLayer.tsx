import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { BoxGeometry, Color, EdgesGeometry, type Mesh, type Texture } from 'three';
import { brushRect, type Cell, type FogState } from '@/domain';
import type { CellRect } from '@/domain/map-v2';
import { useRoomSession } from '@/features/rooms';
import { modelHeightMap, pickCell, type HeightMap } from '@/features/scene';
import { useTokensStore } from '@/features/tokens';
import { useFogStore } from '../hooks/fog-store';
import { createFogTexture, paintFogTexture } from './fog-texture';
import { FOG_PAINTER_MARGIN, FOG_SCENE, fogLiftFor } from './fog-scene';

const BYTE = 255;
const previewGeometry = new EdgesGeometry(new BoxGeometry(1, FOG_SCENE.previewHeight, 1));

function colorBytes(hex: string) {
  const color = new Color(hex);
  return { r: color.r * BYTE, g: color.g * BYTE, b: color.b * BYTE };
}

/** Uma textura do tamanho do mapa, uma casa por pixel; refeita só quando o tamanho muda. */
function useFogTexture(fog: FogState, hex: string): Texture {
  const { width, depth } = fog.size;
  const texture = useMemo(() => createFogTexture(width, depth), [width, depth]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => paintFogTexture(texture, fog, colorBytes(hex)), [fog, texture, hex]);
  return texture;
}

const ignoreRaycast = () => null;

/**
 * A névoa deitada sobre o mapa. Para o jogador é escuridão opaca (e o banco nem mandou o que
 * está embaixo); para o mestre é um véu translúcido por cima de tudo.
 */
function FogOverlay({ fog, master }: { fog: FogState; master: boolean }) {
  const texture = useFogTexture(fog, master ? FOG_SCENE.masterColor : FOG_SCENE.playerColor);
  const { width, depth } = fog.size;
  const mesh = useRef<Mesh>(null);
  // Quanto mais longe a câmera, menos precisa a profundidade: a névoa do jogador sobe junto.
  useFrame(({ camera }) => {
    if (mesh.current) mesh.current.position.y = fogLiftFor(camera.position.y);
  });
  return (
    <mesh
      ref={mesh}
      rotation-x={-Math.PI / 2}
      position={[width / 2, FOG_SCENE.lift, depth / 2]}
      renderOrder={master ? FOG_SCENE.masterRenderOrder : 0}
      raycast={ignoreRaycast}
    >
      <planeGeometry args={[width, depth]} />
      {master ? (
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={FOG_SCENE.masterOpacity}
          depthTest={false}
          depthWrite={false}
        />
      ) : (
        <meshBasicMaterial
          map={texture}
          alphaTest={FOG_SCENE.alphaTest}
          polygonOffset
          polygonOffsetFactor={FOG_SCENE.polygonOffset}
          polygonOffsetUnits={FOG_SCENE.polygonOffset}
        />
      )}
    </mesh>
  );
}

type Toggleable = { enabled: boolean };
function isToggleable(value: unknown): value is Toggleable {
  return typeof value === 'object' && value !== null && 'enabled' in value;
}

function rectBetween(a: Cell, b: Cell): CellRect {
  const x = Math.min(a.x, b.x);
  const z = Math.min(a.z, b.z);
  return { x, z, width: Math.abs(a.x - b.x) + 1, depth: Math.abs(a.z - b.z) + 1 };
}

function RectPreview({ rect }: { rect: CellRect }) {
  return (
    <lineSegments
      geometry={previewGeometry}
      position={[rect.x + rect.width / 2, FOG_SCENE.lift, rect.z + rect.depth / 2]}
      scale={[rect.width, 1, rect.depth]}
      dispose={null}
    >
      <lineBasicMaterial color={FOG_SCENE.previewColor} depthTest={false} />
    </lineSegments>
  );
}

type Stroke = { start: Cell; last: Cell };

/** O pincel e o retângulo do mestre: apertar, arrastar e soltar sobre o mapa. */
function FogPainter({ heights }: { heights: HeightMap }) {
  const tool = useFogStore((state) => state.tool);
  const getState = useThree((state) => state.get);
  const [hover, setHover] = useState<Cell | null>(null);
  const [rectStart, setRectStart] = useState<Cell | null>(null);
  const stroke = useRef<Stroke | null>(null);
  const covered = tool.mode === 'cover';
  const { width, depth } = heights.size;

  // Soltar fora do canvas também termina o traço.
  useEffect(() => {
    const finish = () => {
      const current = stroke.current;
      if (!current) return;
      stroke.current = null;
      setRectStart(null);
      const { controls } = getState();
      if (isToggleable(controls)) controls.enabled = true;
      if (tool.shape === 'rect') {
        useFogStore.getState().paintRect(rectBetween(current.start, current.last), covered);
      }
    };
    window.addEventListener('pointerup', finish);
    window.addEventListener('blur', finish);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('blur', finish);
    };
  }, [tool.shape, covered, getState]);

  const cellOf = (event: ThreeEvent<PointerEvent>) => pickCell(event.ray, heights)?.cell ?? null;

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const cell = cellOf(event);
    if (!cell) return;
    const { controls } = getState();
    if (isToggleable(controls)) controls.enabled = false;
    stroke.current = { start: cell, last: cell };
    if (tool.shape === 'brush') {
      useFogStore.getState().paintRect(brushRect(cell, tool.radius), covered);
    } else {
      setRectStart(cell);
    }
  };

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const cell = cellOf(event);
    setHover((current) => (current?.x === cell?.x && current?.z === cell?.z ? current : cell));
    const current = stroke.current;
    if (!current || !cell) return;
    current.last = cell;
    if (tool.shape === 'brush') {
      useFogStore.getState().paintRect(brushRect(cell, tool.radius), covered);
    }
  };

  const brushRadius = tool.shape === 'brush' ? tool.radius : 0;
  const preview = rectStart && hover ? rectBetween(rectStart, hover) : null;
  const shown = preview ?? (hover ? brushRect(hover, brushRadius) : null);

  return (
    <>
      <mesh
        visible={false}
        rotation-x={-Math.PI / 2}
        position={[width / 2, FOG_SCENE.painterLift, depth / 2]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        <planeGeometry args={[width + FOG_PAINTER_MARGIN, depth + FOG_PAINTER_MARGIN]} />
      </mesh>
      {shown && <RectPreview rect={shown} />}
    </>
  );
}

/** Camada da névoa na cena: o véu (todos) e o pincel (só o mestre, com a ferramenta ligada). */
export default function FogLayer() {
  const { isGameMaster } = useRoomSession();
  const fog = useFogStore((state) => state.fog);
  const painting = useFogStore((state) => state.tool.painting);
  const model = useTokensStore((state) => state.view?.model ?? null);
  const heights = useMemo(() => (model ? modelHeightMap(model) : null), [model]);
  const sameSize =
    fog !== null &&
    model !== null &&
    fog.size.width === model.size.width &&
    fog.size.depth === model.size.depth;

  if (!fog || !heights || !sameSize) return null;
  return (
    <>
      {fog.enabled && <FogOverlay fog={fog} master={isGameMaster} />}
      {isGameMaster && painting && <FogPainter heights={heights} />}
    </>
  );
}
