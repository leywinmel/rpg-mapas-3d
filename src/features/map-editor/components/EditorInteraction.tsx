import { useEffect, useMemo, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import {
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  RingGeometry,
  MeshBasicMaterial,
} from 'three';
import { isInside } from '@/domain';
import {
  pieceRect,
  stepsToWorld,
  terrainAt,
  type Footprint,
  type MapModel,
  type MapPiece,
  type PieceRef,
} from '@/domain/map-v2';
import {
  modelHeightMap,
  nearestEdge,
  pickCell,
  SCENE_PALETTE,
  stackedWallSegments,
  surfaceAt,
  type CellHit,
  type HeightMap,
} from '@/features/scene';
import { pieceTransform } from '@/features/scene/chunks/chunk-instances';
import {
  AssetPieces,
  CatalogPieces,
  type ModelUrls,
} from '@/features/scene/components/AssetPieces';
import type { Brush, PointerHit, Tool } from '../editor/editor-reducer';
import { eraseTargetAt, findPiece, pieceFor, wallFor } from '../editor/model-ops';

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
    if (dragging && hit) actions.onStrokeMove(hit);
  };

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0 || view.tool === 'select') return;
    const hit = pickCell(event.ray, heights);
    if (!hit) return;
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
      {hover && (
        <Ghost hit={hover} view={view} model={model} heights={heights} modelUrls={modelUrls} />
      )}
      {view.selectedPiece && <SelectionRing model={model} selected={view.selectedPiece} />}
    </>
  );
}
