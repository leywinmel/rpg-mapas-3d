/**
 * Monta, fora da tela, o objeto 3D que vira o .glb: uma malha instanciada por camada de peça,
 * com as mesmas geometrias e materiais da cena. Modelo que não carrega vira a caixa marcada,
 * como na tela, e a exportação conta quantos foram para avisar.
 */
import { Group, InstancedMesh, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { pieceCatalog, type InstanceTransform } from '@/features/scene';
import type { ModelUrls } from '@/features/scene/components/AssetPieces';
import { bakeModel } from '@/features/scene/catalog/model-layers';
import {
  getColumnGeometry,
  getFallbackLayers,
  getMaterial,
  getPieceLayers,
  type PieceLayer,
} from '@/features/scene/catalog/piece-geometry';
import { writeColors, writeTransforms } from '@/features/scene/chunks/instance-matrices';
import { logger } from '@/lib/logger';
import { CELL_METERS } from '../constants';
import type { MapInstances } from './map-instances';

export type ModelLoader = (url: string) => Promise<Object3D>;

const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export const loadGltfScene: ModelLoader = async (url) => (await gltfLoader.loadAsync(url)).scene;

export type BuiltMap = {
  readonly root: Group;
  /** Tipos de modelo que não carregaram e saíram como caixa marcada. */
  readonly missingModels: number;
  /** Solta o que foi criado só para o arquivo (as geometrias do catálogo são da cena e ficam). */
  readonly dispose: () => void;
};

type LayerSource = { key: string; layers: PieceLayer[]; transforms: InstanceTransform[] };

function instancedLayer(name: string, layer: PieceLayer, transforms: InstanceTransform[]) {
  const mesh = new InstancedMesh(layer.geometry, layer.material, transforms.length);
  mesh.name = name;
  writeTransforms(mesh, transforms);
  return mesh;
}

export type BuildMapInput = {
  instances: MapInstances;
  modelUrls?: ModelUrls;
  loadModel?: ModelLoader;
};

export async function buildMapObject({
  instances,
  modelUrls,
  loadModel = loadGltfScene,
}: BuildMapInput): Promise<BuiltMap> {
  const baked: PieceLayer[] = [];
  const cache = new Map<string, Promise<PieceLayer[] | null>>();
  let missingModels = 0;

  const modelLayers = (url: string, fitToCell: boolean): Promise<PieceLayer[] | null> => {
    const cached = cache.get(url);
    if (cached) return cached;
    const loading = loadModel(url)
      .then((scene) => {
        const layers = bakeModel(scene, { fitToCell });
        baked.push(...layers);
        return layers;
      })
      .catch((error: unknown) => {
        // Contornável: sai a caixa marcada, e o painel avisa quantos modelos faltaram.
        logger.warn('Modelo 3D não carregou na exportação.', { feature: 'export' }, error);
        return null;
      });
    cache.set(url, loading);
    return loading;
  };

  const withFallback = async (layers: Promise<PieceLayer[] | null> | null) => {
    const loaded = layers ? await layers : null;
    if (loaded) return loaded;
    missingModels += 1;
    return getFallbackLayers();
  };

  const sources: LayerSource[] = [];
  for (const [key, transforms] of instances.catalog) {
    const visual = pieceCatalog.get(key)?.visual;
    const layers =
      visual?.type === 'model'
        ? await withFallback(modelLayers(visual.url, false))
        : getPieceLayers(key);
    sources.push({ key, layers, transforms });
  }
  for (const [assetId, transforms] of instances.uploads) {
    const url = modelUrls?.[assetId];
    const layers = await withFallback(url ? modelLayers(url, true) : null);
    sources.push({ key: assetId, layers, transforms });
  }

  const map = new Group();
  map.name = 'mapa';
  // A cena mede em casas; o glTF mede em metros.
  map.scale.setScalar(CELL_METERS);
  const { columns } = instances;
  if (columns.transforms.length > 0) {
    const layer = { geometry: getColumnGeometry(), material: getMaterial('column') };
    const mesh = instancedLayer('chao-base', layer, columns.transforms);
    writeColors(mesh, columns.colors);
    map.add(mesh);
  }
  for (const source of sources) {
    if (source.transforms.length === 0) continue;
    source.layers.forEach((layer, index) => {
      map.add(instancedLayer(`${source.key}-${index}`, layer, source.transforms));
    });
  }

  return {
    root: map,
    missingModels,
    dispose: () => {
      for (const layer of baked) layer.geometry.dispose();
      map.traverse((object) => {
        if (object instanceof InstancedMesh) object.dispose();
      });
    },
  };
}
