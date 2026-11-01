import { useEffect, useMemo, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import {
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  RingGeometry,
  MeshBasicMaterial,
} from 'three';
import type { GridSize, MapDocument } from '@/domain';
import {
  buildHeightMap,
  nearestEdge,
  pickCell,
  SCENE_PALETTE,
  surfaceAt,
  wallSegmentTransforms,
  type CellHit,
  type HeightMap,
} from '@/features/scene';
import {
  AssetPieces,
  CatalogPieces,
  type ModelUrls,
} from '@/features/scene/components/AssetPieces';
import { eraseTargetAt, floorAt } from '../editor/document-ops';
import type { Brush, PointerHit, Tool } from '../editor/editor-reducer';

/** Arrasto menor que isto (px) ainda conta como clique de seleção, não como giro de câmera. */
const CLICK_TOLERANCE_PX = 4;
const MARKER_LIFT = 0.03;
/** O chão fantasma flutua um fio acima do real para não brigar com ele na tela. */
const GHOST_LIFT = 0.012;
const MARKER_HEIGHT = 0.06;
const SELECTION_RADIUS = { inner: 0.38, outer: 0.46 };
/** Plano invisível bem maior que o mapa: o cursor nunca "cai" fora dele perto da borda. */
const CATCH_PLANE_MARGIN = 200;

export type EditorViewState = {
  tool: Tool;
  brush: Brush;
  rotation: number;
  wallHeight: number;
  selectedPropId: string | null;
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

type GhostProps = {
  hit: CellHit;
  view: EditorViewState;
  document: MapDocument;
  heights: HeightMap;
  modelUrls: ModelUrls;
};

/** Pré-visualização translúcida do que o clique vai fazer, na casa sob o cursor. */
function Ghost({ hit, view, document, heights, modelUrls }: GhostProps) {
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
      const wall = {
        ...nearestEdge(cell, hit.point),
        style: view.brush.wall,
        height: view.wallHeight,
      };
      return (
        <CatalogPieces
          pieceKey={view.brush.wall}
          transforms={wallSegmentTransforms(heights, wall)}
          ghost
        />
      );
    }
    case 'prop': {
      const transforms = [
        {
          x: cell.x + 0.5,
          y: surfaceAt(heights, cell),
          z: cell.z + 0.5,
          rotationY: view.rotation,
          scale: 1,
        },
      ];
      return (
        <AssetPieces asset={view.brush.prop} transforms={transforms} modelUrls={modelUrls} ghost />
      );
    }
    case 'erase':
      return eraseTargetAt(document, hit) ? (
        <CellMarker hit={hit} heights={heights} danger />
      ) : null;
    case 'raise':
    case 'lower':
      return floorAt(document, cell) ? <CellMarker hit={hit} heights={heights} /> : null;
    case 'select':
      return <CellMarker hit={hit} heights={heights} />;
  }
}

function SelectionRing({
  document,
  selectedPropId,
}: {
  document: MapDocument;
  selectedPropId: string;
}) {
  const prop = document.props.find((item) => item.id === selectedPropId);
  if (!prop) return null;
  return (
    <mesh
      geometry={ringGeometry}
      material={selectionMaterial}
      position={[prop.x, prop.elevation + MARKER_LIFT, prop.z]}
      scale={prop.scale}
      dispose={null}
    />
  );
}

export type EditorInteractionProps = EditorSceneBinding & {
  document: MapDocument;
  size: GridSize;
  modelUrls: ModelUrls;
};

/**
 * Camada de edição dentro da cena: lê a casa sob o cursor (pelo mapa de
 * alturas, sem testar instância por instância), desenha o fantasma e repassa
 * apertar/arrastar/soltar para o editor.
 */
export function EditorInteraction({
  document,
  size,
  modelUrls,
  view,
  actions,
}: EditorInteractionProps) {
  const { width, depth } = size;
  const heights = useMemo(
    () => buildHeightMap(document.floors, { width, depth }),
    [document.floors, width, depth],
  );
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
        <Ghost
          hit={hover}
          view={view}
          document={document}
          heights={heights}
          modelUrls={modelUrls}
        />
      )}
      {view.selectedPropId && (
        <SelectionRing document={document} selectedPropId={view.selectedPropId} />
      )}
    </>
  );
}
