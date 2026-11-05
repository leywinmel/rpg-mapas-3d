import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import {
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  RingGeometry,
  MeshBasicMaterial,
} from 'three';
import { isInside, type Cell } from '@/domain';
import { findPrefab, prefabBaseLevel, prefabBlueprint, prefabRect } from '@/domain/map-gen';
import {
  isRectInside,
  pieceRect,
  stepsToWorld,
  STORY_HEIGHT_STEPS,
  terrainAt,
  type Footprint,
  type MapModel,
  type MapPiece,
  type PieceRef,
} from '@/domain/map-v2';
import {
  isMovableAsset,
  modelHeightMap,
  nearestEdge,
  pickCell,
  SCENE_PALETTE,
  stackedWallSegments,
  surfaceAt,
  type CellHit,
  type HeightMap,
} from '@/features/scene';
import { useCameraLock } from '@/features/scene/camera/useCameraLock';
import { pieceTransform } from '@/features/scene/chunks/chunk-instances';
import {
  AssetPieces,
  CatalogPieces,
  type ModelUrls,
} from '@/features/scene/components/AssetPieces';
import type { Brush, PointerHit, Tool } from '../editor/editor-reducer';
import {
  eraseTargetAt,
  findPiece,
  movePieceTo,
  pieceFor,
  topPieceAt,
  wallFor,
} from '../editor/model-ops';

/** Arrasto menor que isto (px) ainda conta como clique de seleção, não como giro de câmera. */
const CLICK_TOLERANCE_PX = 4;
const MARKER_LIFT = 0.03;
/** O chão fantasma flutua um fio acima do real para não brigar com ele na tela. */
const GHOST_LIFT = 0.012;
const MARKER_HEIGHT = 0.06;
const SELECTION_RADIUS = { inner: 0.38, outer: 0.46 };
/** Id da peça fantasma: nunca é gravada, só serve para calcular onde a peça nova ficaria. */
const GHOST_PIECE_ID = 'fantasma';
/** Plano invisível bem maior que o mapa: o cursor nunca "cai" fora dele perto da borda. */
const CATCH_PLANE_MARGIN = 200;

export type EditorViewState = {
  tool: Tool;
  brush: Brush;
  /** Giro do próximo objeto, em quartos de volta. */
  rotation: number;
  footprint: Footprint;
  /** Altura da próxima parede, em degraus. */
  wallHeight: number;
  selectedPiece: PieceRef | null;
};

export type EditorSceneActions = {
  onStrokeStart: (hit: PointerHit) => void;
  onStrokeMove: (hit: PointerHit) => void;
  onStrokeEnd: () => void;
  onSelectAt: (hit: PointerHit) => void;
  /** Apertou um carro ou objeto solto com a ferramenta Selecionar: ele fica selecionado. */
  onGrab: (hit: PointerHit) => void;
  /** Soltou o objeto arrastado nesta âncora (a casa de menor x e z dele). */
  onDrop: (anchor: Cell) => void;
};

export type EditorSceneBinding = { view: EditorViewState; actions: EditorSceneActions };

const markerGeometry = new EdgesGeometry(new BoxGeometry(1, MARKER_HEIGHT, 1));
const ringGeometry = new RingGeometry(SELECTION_RADIUS.inner, SELECTION_RADIUS.outer, 24).rotateX(
  -Math.PI / 2,
);
const markerMaterials = {
  normal: new LineBasicMaterial({ color: SCENE_PALETTE.ghost }),
  danger: new LineBasicMaterial({ color: SCENE_PALETTE.ghostDanger }),
};
const selectionMaterial = new MeshBasicMaterial({
  color: SCENE_PALETTE.selection,
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
});

function hoverKey(tool: Tool, hit: CellHit | null): string {
  if (!hit) return '';
  if (tool !== 'wall') return `${hit.cell.x}:${hit.cell.z}`;
  const edge = nearestEdge(hit.cell, hit.point);
  return `${edge.side}:${edge.x}:${edge.z}`;
}

type MarkerProps = { hit: CellHit; heights: HeightMap; danger?: boolean };

/** Contorno da casa; a altura vem do mapa atual (a casa pode ter subido depois do cursor parar). */
function CellMarker({ hit, heights, danger }: MarkerProps) {
  return (
    <lineSegments
      geometry={markerGeometry}
      material={danger ? markerMaterials.danger : markerMaterials.normal}
      position={[hit.cell.x + 0.5, surfaceAt(heights, hit.cell) + MARKER_LIFT, hit.cell.z + 0.5]}
      dispose={null}
    />
  );
}

/** Contorno das casas que a peça ocupa; vermelho quando ela sai do mapa (o clique é recusado). */
function FootprintMarker({ piece, model }: { piece: MapPiece; model: MapModel }) {
  const rect = pieceRect(piece);
  const fits =
    isInside(model.size, piece) &&
    rect.x + rect.width <= model.size.width &&
    rect.z + rect.depth <= model.size.depth;
  return (
    <lineSegments
      geometry={markerGeometry}
      material={fits ? markerMaterials.normal : markerMaterials.danger}
      position={[
        rect.x + rect.width / 2,
        stepsToWorld(piece.level) + MARKER_LIFT,
        rect.z + rect.depth / 2,
      ]}
      scale={[rect.width, 1, rect.depth]}
      dispose={null}
    />
  );
}

/**
 * Caixa do volume da casa pronta (planta × andares), no chão em que ela vai assentar; vermelha
 * quando ela sai do mapa. Só o contorno: desenhar centenas de peças fantasmas a cada casa que
 * o cursor passa pesaria à toa.
 */
function PrefabGhost({ hit, view, model }: Pick<GhostProps, 'hit' | 'view' | 'model'>) {
  const prefab = findPrefab(view.brush.prefab);
  if (!prefab) return null;
  const blueprint = prefabBlueprint(prefab);
  const rect = prefabRect(blueprint, hit.cell, view.rotation);
  const fits = isRectInside(model.size, rect);
  const base = fits ? stepsToWorld(prefabBaseLevel(model, rect)) : 0;
  const height = stepsToWorld(blueprint.stories * STORY_HEIGHT_STEPS);
  return (
    <lineSegments
      geometry={markerGeometry}
      material={fits ? markerMaterials.normal : markerMaterials.danger}
      position={[rect.x + rect.width / 2, base + height / 2, rect.z + rect.depth / 2]}
      scale={[rect.width, height / MARKER_HEIGHT, rect.depth]}
      dispose={null}
    />
  );
}

type GhostProps = {
  hit: CellHit;
  view: EditorViewState;
  model: MapModel;
  heights: HeightMap;
  modelUrls: ModelUrls;
};

function PieceGhost({ hit, view, model, modelUrls }: Omit<GhostProps, 'heights'>) {
  const piece = pieceFor(model, {
    id: GHOST_PIECE_ID,
    asset: view.brush.prop,
    anchor: hit.cell,
    rotation: view.rotation,
    footprint: view.footprint,
  });
  return (
    <>
      <AssetPieces
        asset={view.brush.prop}
        transforms={[pieceTransform(piece)]}
        modelUrls={modelUrls}
        ghost
      />
      <FootprintMarker piece={piece} model={model} />
    </>
  );
}

/** Pré-visualização translúcida do que o clique vai fazer, na casa sob o cursor. */
function Ghost({ hit, view, model, heights, modelUrls }: GhostProps) {
  const { cell } = hit;
  switch (view.tool) {
    case 'floor': {
      const transforms = [
        {
          x: cell.x + 0.5,
          y: surfaceAt(heights, cell) + GHOST_LIFT,
          z: cell.z + 0.5,
          rotationY: 0,
          scale: 1,
        },
      ];
      return <CatalogPieces pieceKey={view.brush.floor} transforms={transforms} ghost />;
    }
    case 'wall': {
      const wall = wallFor(model, {
        edge: nearestEdge(cell, hit.point),
        style: view.brush.wall,
        height: view.wallHeight,
      });
      const transforms = stackedWallSegments(
        wall,
        stepsToWorld(wall.level),
        stepsToWorld(wall.height),
      );
      return <CatalogPieces pieceKey={view.brush.wall} transforms={transforms} ghost />;
    }
    case 'prop':
      return <PieceGhost hit={hit} view={view} model={model} modelUrls={modelUrls} />;
    case 'prefab':
      return <PrefabGhost hit={hit} view={view} model={model} />;
    case 'erase':
      return eraseTargetAt(model, hit) ? <CellMarker hit={hit} heights={heights} danger /> : null;
    case 'raise':
    case 'lower':
      return terrainAt(model, cell)?.tile ? <CellMarker hit={hit} heights={heights} /> : null;
    case 'select':
      return <CellMarker hit={hit} heights={heights} />;
  }
}

function SelectionRing({ model, selected }: { model: MapModel; selected: PieceRef }) {
  const piece = findPiece(model, selected);
  if (!piece) return null;
  const { x, y, z } = pieceTransform(piece);
  const rect = pieceRect(piece);
  // O anel abraça a peça inteira: numa peça de várias casas ele cresce com o lado maior.
  const scale = Math.max(rect.width, rect.depth) * piece.scale;
  return (
    <mesh
      geometry={ringGeometry}
      material={selectionMaterial}
      position={[x, y + MARKER_LIFT, z]}
      scale={scale}
      dispose={null}
    />
  );
}

/** Arraste de um objeto já posto: quem é, onde o cursor pegou nele e onde ele cairia agora. */
type PieceDrag = {
  ref: PieceRef;
  /** Casa apertada menos a âncora: o objeto não pula para debaixo do cursor ao pegar. */
  grip: { dx: number; dz: number };
  anchor: Cell;
  startX: number;
  startY: number;
  moved: boolean;
};

type DragGhostProps = { drag: PieceDrag; model: MapModel; modelUrls: ModelUrls };

/** Onde o objeto arrastado cairia: já apoiado no chão novo, ou vermelho quando sai do mapa. */
function DragGhost({ drag, model, modelUrls }: DragGhostProps) {
  const piece = findPiece(model, drag.ref);
  const preview = useMemo(() => {
    if (!piece) return null;
    const moved = movePieceTo(model, piece, drag.anchor);
    const ref = { id: piece.id, ...drag.anchor };
    return moved.ok ? (findPiece(moved.value, ref) ?? null) : null;
  }, [model, piece, drag.anchor]);
  if (!piece) return null;
  if (!preview) return <FootprintMarker piece={{ ...piece, ...drag.anchor }} model={model} />;
  return (
    <>
      <AssetPieces
        asset={preview.asset}
        transforms={[pieceTransform(preview)]}
        modelUrls={modelUrls}
        ghost
      />
      <FootprintMarker piece={preview} model={model} />
    </>
  );
}

/** Carro ou objeto solto mais alto da casa: o que o mestre pega com a ferramenta Selecionar. */
function grabbableAt(model: MapModel, cell: Cell): MapPiece | undefined {
  const top = topPieceAt(model, cell);
  return top && isMovableAsset(top.asset) ? top : undefined;
}

/**
 * Pegar, arrastar e soltar um objeto já posto (RPG-27). Enquanto arrasta, a câmera não gira; o
 * mapa só muda ao soltar, num passo só do histórico (é aí que a mesa vê o objeto deslizar).
 */
function usePieceDrag(model: MapModel, actions: EditorSceneActions) {
  const lockCamera = useCameraLock();
  const [drag, setDrag] = useState<PieceDrag | null>(null);
  const dragRef = useRef<PieceDrag | null>(null);
  const update = (next: PieceDrag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  // Soltar fora do canvas também termina o arraste (senão o objeto ficaria "grudado").
  useEffect(() => {
    if (!drag) return;
    const finish = () => {
      const current = dragRef.current;
      update(null);
      lockCamera(false);
      if (!current?.moved) return;
      if (current.anchor.x === current.ref.x && current.anchor.z === current.ref.z) return;
      actions.onDrop(current.anchor);
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

  const start = (event: ThreeEvent<PointerEvent>, hit: PointerHit) => {
    const piece = grabbableAt(model, hit.cell);
    if (!piece) return;
    lockCamera(true);
    actions.onGrab(hit);
    update({
      ref: { id: piece.id, x: piece.x, z: piece.z },
      grip: { dx: hit.cell.x - piece.x, dz: hit.cell.z - piece.z },
      anchor: { x: piece.x, z: piece.z },
      startX: event.nativeEvent.clientX,
      startY: event.nativeEvent.clientY,
      moved: false,
    });
  };

  const move = (event: ThreeEvent<PointerEvent>, hit: PointerHit | null) => {
    const current = dragRef.current;
    if (!current || !hit) return;
    const distance = Math.hypot(
      event.nativeEvent.clientX - current.startX,
      event.nativeEvent.clientY - current.startY,
    );
    if (!current.moved && distance <= CLICK_TOLERANCE_PX) return;
    const anchor = { x: hit.cell.x - current.grip.dx, z: hit.cell.z - current.grip.dz };
    if (current.moved && anchor.x === current.anchor.x && anchor.z === current.anchor.z) return;
    update({ ...current, anchor, moved: true });
  };

  return { drag, start, move };
}

type GrabCursor = 'none' | 'grab' | 'grabbing';

/** Mãozinha sobre o que dá para pegar; mão fechada enquanto arrasta. */
function useGrabCursor(cursor: GrabCursor) {
  const get = useThree((three) => three.get);
  useEffect(() => {
    if (cursor === 'none') return;
    const canvas = get().gl.domElement;
    const previous = canvas.style.cursor;
    canvas.style.cursor = cursor;
    return () => {
      canvas.style.cursor = previous;
    };
  }, [get, cursor]);
}

export type EditorInteractionProps = EditorSceneBinding & {
  model: MapModel;
  modelUrls: ModelUrls;
};

/**
 * Camada de edição dentro da cena: lê a casa sob o cursor (pelo mapa de
 * alturas, sem testar instância por instância), desenha o fantasma e repassa
 * apertar/arrastar/soltar para o editor.
 */
export function EditorInteraction({ model, modelUrls, view, actions }: EditorInteractionProps) {
  const { width, depth } = model.size;
  const heights = useMemo(() => modelHeightMap(model), [model]);
  const [hover, setHover] = useState<CellHit | null>(null);
  const [dragging, setDragging] = useState(false);
  const currentKey = useRef('');
  const pieceDrag = usePieceDrag(model, actions);
  const canGrab =
    view.tool === 'select' && hover !== null && grabbableAt(model, hover.cell) !== undefined;
  useGrabCursor(pieceDrag.drag ? 'grabbing' : canGrab ? 'grab' : 'none');

  const updateHover = (hit: CellHit | null) => {
    const key = hoverKey(view.tool, hit);
    if (key === currentKey.current) return;
    currentKey.current = key;
    setHover(hit);
  };

  // Soltar o botão fora do canvas também encerra o traço (senão o pincel ficaria "grudado").
  useEffect(() => {
    if (!dragging) return;
    const stop = () => {
      setDragging(false);
      actions.onStrokeEnd();
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('blur', stop);
    };
  }, [dragging, actions]);

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    const hit = pickCell(event.ray, heights);
    updateHover(hit);
    pieceDrag.move(event, hit);
    if (dragging && hit) actions.onStrokeMove(hit);
  };

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return;
    const hit = pickCell(event.ray, heights);
    if (!hit) return;
    if (view.tool === 'select') {
      pieceDrag.start(event, hit);
      return;
    }
    setDragging(true);
    actions.onStrokeStart(hit);
  };

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (view.tool !== 'select' || event.delta > CLICK_TOLERANCE_PX) return;
    const hit = pickCell(event.ray, heights);
    if (hit) actions.onSelectAt(hit);
  };

  return (
    <>
      <mesh
        visible={false}
        rotation-x={-Math.PI / 2}
        position={[width / 2, 0, depth / 2]}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onPointerLeave={() => updateHover(null)}
      >
        <planeGeometry args={[width + CATCH_PLANE_MARGIN, depth + CATCH_PLANE_MARGIN]} />
      </mesh>
      {hover && !pieceDrag.drag?.moved && (
        <Ghost hit={hover} view={view} model={model} heights={heights} modelUrls={modelUrls} />
      )}
      {pieceDrag.drag?.moved && (
        <DragGhost drag={pieceDrag.drag} model={model} modelUrls={modelUrls} />
      )}
      {view.selectedPiece && <SelectionRing model={model} selected={view.selectedPiece} />}
    </>
  );
}
