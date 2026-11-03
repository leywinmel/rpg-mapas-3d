import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { chunkKey, type Cutaway, type MapChunk } from '@/domain/map-v2';
import { getColumnGeometry, getFarWallGeometry, getMaterial } from '../catalog/piece-geometry';
import { chunkWorldBox } from '../chunks/chunk-culling';
import {
  farInstances,
  pieceGroups,
  terrainInstances,
  wallGroups,
  type FarInstances,
  type TerrainInstances,
} from '../chunks/chunk-instances';
import type { Box } from '../layout';
import { AssetPieces, CatalogPieces, type ModelUrls } from './AssetPieces';
import { ChunkGrid } from './BoardGrid';
import { InstancedLayer } from './PieceInstances';

/** O que o recorte de câmera precisa de um pedaço montado: a caixa e os grupos que ele liga e desliga. */
export type ChunkHandle = {
  readonly box: Box;
  /** O pedaço inteiro: escondido fora da câmera. */
  readonly root: Group;
  /** O desenho de perto: terreno e paredes detalhados, peças e grade. */
  readonly near: Group;
  /** O desenho de longe: blocos lisos de terreno e paredes, sem peças. */
  readonly far: Group;
  /** O desenho de perto já está montado? */
  readonly isNearReady: () => boolean;
  /** Pede a montagem do desenho de perto (só da primeira vez faz algo). */
  readonly mountNear: () => void;
};

/** Pedaços montados, pela chave de chunkKey(). Mutável de propósito: o recorte lê a cada quadro. */
export type ChunkRegistry = Map<string, ChunkHandle>;

function Terrain({ terrain }: { terrain: TerrainInstances }) {
  if (terrain.columns.transforms.length === 0) return null;
  return (
    <>
      <InstancedLayer
        geometry={getColumnGeometry()}
        material={getMaterial('column')}
        transforms={terrain.columns.transforms}
        colors={terrain.columns.colors}
      />
      {terrain.caps.map((cap) => (
        <CatalogPieces key={cap.tile} pieceKey={cap.tile} transforms={cap.transforms} />
      ))}
    </>
  );
}

/** Sem sombra: de longe a sombra nem aparece no mapa de sombra, e o passe dela sai mais barato. */
function FarView({ far }: { far: FarInstances }) {
  return (
    <>
      {far.terrain.transforms.length > 0 && (
        <InstancedLayer
          geometry={getColumnGeometry()}
          material={getMaterial('column')}
          transforms={far.terrain.transforms}
          colors={far.terrain.colors}
          shadows={false}
        />
      )}
      {far.walls.transforms.length > 0 && (
        <InstancedLayer
          geometry={getFarWallGeometry()}
          material={getMaterial('column')}
          transforms={far.walls.transforms}
          colors={far.walls.colors}
          shadows={false}
        />
      )}
    </>
  );
}

type NearViewProps = {
  chunk: MapChunk;
  cutaway: Cutaway;
  modelUrls?: ModelUrls;
  showGrid: boolean;
};

/** O pedaço de perto: terreno e paredes detalhados, peças e grade. */
function NearView({ chunk, cutaway, modelUrls, showGrid }: NearViewProps) {
  const terrain = useMemo(() => terrainInstances(chunk), [chunk]);
  const walls = useMemo(() => wallGroups(chunk, cutaway), [chunk, cutaway]);
  const pieces = useMemo(() => pieceGroups(chunk, cutaway), [chunk, cutaway]);
  return (
    <>
      <Terrain terrain={terrain} />
      {walls.map((group) => (
        <CatalogPieces key={group.style} pieceKey={group.style} transforms={group.transforms} />
      ))}
      {pieces.map((group) => (
        <AssetPieces
          key={group.key}
          asset={group.asset}
          transforms={group.transforms}
          modelUrls={modelUrls}
        />
      ))}
      {showGrid && <ChunkGrid chunk={chunk} />}
    </>
  );
}

export type ChunkViewProps = NearViewProps & { registry: ChunkRegistry };

/**
 * Um pedaço do mapa, um InstancedMesh por tipo de peça. É memo pela referência do pedaço (as
 * operações do v2 só trocam o pedaço que mudam), então editar uma casa redesenha um pedaço e
 * não o mapa. O desenho de perto só monta quando a câmera chega perto pela primeira vez e
 * depois fica: medido no mapa 1000×1000, montar tudo de perto levava ~5,5 s, e na visão geral
 * quase todo pedaço só aparece de longe.
 */
export const ChunkView = memo(function ChunkView({ registry, ...view }: ChunkViewProps) {
  const { chunk, cutaway } = view;
  const root = useRef<Group>(null);
  const near = useRef<Group>(null);
  const far = useRef<Group>(null);
  const [nearMounted, setNearMounted] = useState(false);
  const nearReady = useRef(false);
  const farBlocks = useMemo(() => farInstances(chunk, cutaway), [chunk, cutaway]);
  const box = useMemo(() => chunkWorldBox(chunk), [chunk]);
  const key = chunkKey(chunk.coord);

  useLayoutEffect(() => {
    nearReady.current = nearMounted;
  }, [nearMounted]);

  useLayoutEffect(() => {
    if (!root.current || !near.current || !far.current) return;
    registry.set(key, {
      box,
      root: root.current,
      near: near.current,
      far: far.current,
      isNearReady: () => nearReady.current,
      mountNear: () => {
        if (!nearReady.current) setNearMounted(true);
      },
    });
    return () => {
      registry.delete(key);
    };
  }, [registry, key, box]);

  return (
    <group ref={root} visible={false}>
      <group ref={near}>{nearMounted && <NearView {...view} />}</group>
      <group ref={far}>
        <FarView far={farBlocks} />
      </group>
    </group>
  );
});
