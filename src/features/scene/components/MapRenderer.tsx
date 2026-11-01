import { memo, useMemo } from 'react';
import type { FloorTile, GridSize, MapDocument, Prop, Wall } from '@/domain';
import { pieceCatalog } from '../catalog/catalog';
import { SCENE_PALETTE } from '../catalog/palette';
import { getColumnGeometry, getMaterial } from '../catalog/piece-geometry';
import {
  assetGroupKey,
  buildHeightMap,
  floorCapTransform,
  floorColumnTransform,
  groupBy,
  propTransform,
  wallSegmentTransforms,
  type HeightMap,
} from '../layout';
import { BoardGrid } from './BoardGrid';
import { AssetPieces, CatalogPieces, type ModelUrls } from './AssetPieces';
import { InstancedLayer } from './PieceInstances';
import { TorchLights } from './TorchLights';

function Floors({ floors }: { floors: readonly FloorTile[] }) {
  const groups = useMemo(() => [...groupBy(floors, (floor) => floor.tile)], [floors]);
  const columns = useMemo(
    () => ({
      transforms: floors.map(floorColumnTransform),
      colors: floors.map(
        (floor) => pieceCatalog.get(floor.tile)?.sideColor ?? SCENE_PALETTE.stoneSide,
      ),
    }),
    [floors],
  );
  if (floors.length === 0) return null;
  return (
    <>
      <InstancedLayer
        geometry={getColumnGeometry()}
        material={getMaterial('column')}
        transforms={columns.transforms}
        colors={columns.colors}
      />
      {groups.map(([tile, items]) => (
        <FloorGroup key={tile} tile={tile} floors={items} />
      ))}
    </>
  );
}

function FloorGroup({ tile, floors }: { tile: string; floors: readonly FloorTile[] }) {
  const transforms = useMemo(() => floors.map(floorCapTransform), [floors]);
  return <CatalogPieces pieceKey={tile} transforms={transforms} />;
}

function Walls({ walls, heights }: { walls: readonly Wall[]; heights: HeightMap }) {
  const groups = useMemo(() => {
    const byStyle = groupBy(walls, (wall) => wall.style);
    return [...byStyle].map(([style, items]) => ({
      style,
      transforms: items.flatMap((wall) => wallSegmentTransforms(heights, wall)),
    }));
  }, [walls, heights]);
  return (
    <>
      {groups.map((group) => (
        <CatalogPieces key={group.style} pieceKey={group.style} transforms={group.transforms} />
      ))}
    </>
  );
}

function Props({ props, modelUrls }: { props: readonly Prop[]; modelUrls?: ModelUrls }) {
  const groups = useMemo(() => {
    const byAsset = groupBy(props, (prop) => assetGroupKey(prop.asset));
    return [...byAsset].map(([key, items]) => ({
      key,
      asset: items[0]!.asset,
      transforms: items.map(propTransform),
    }));
  }, [props]);
  return (
    <>
      {groups.map((group) => (
        <AssetPieces
          key={group.key}
          asset={group.asset}
          transforms={group.transforms}
          modelUrls={modelUrls}
        />
      ))}
    </>
  );
}

export type MapRendererProps = {
  document: MapDocument;
  size: GridSize;
  modelUrls?: ModelUrls;
  showGrid?: boolean;
};

/**
 * Desenha o diorama: chão, paredes e objetos agrupados por tipo de peça, cada
 * grupo num InstancedMesh. Só refaz o grupo cuja lista mudou.
 */
export const MapRenderer = memo(function MapRenderer({
  document,
  size,
  modelUrls,
  showGrid = true,
}: MapRendererProps) {
  const { width, depth } = size;
  const heights = useMemo(
    () => buildHeightMap(document.floors, { width, depth }),
    [document.floors, width, depth],
  );
  return (
    <>
      {showGrid && <BoardGrid heights={heights} />}
      <Floors floors={document.floors} />
      <Walls walls={document.walls} heights={heights} />
      <Props props={document.props} modelUrls={modelUrls} />
      <TorchLights props={document.props} />
    </>
  );
});
