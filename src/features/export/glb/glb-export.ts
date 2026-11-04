/**
 * O .glb do mapa (RPG-16). Este módulo e o GLTFExporter só baixam quando alguém exporta: o
 * painel importa com import() [#68].
 */
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { Cutaway, MapChunk } from '@/domain/map-v2';
import type { ModelUrls } from '@/features/scene/components/AssetPieces';
import { GLB_MIME_TYPE } from '../constants';
import { buildMapObject, type ModelLoader } from './build-map-object';
import { collectMapInstances } from './map-instances';

export type GlbExportInput = {
  /** Pedaços já recortados (área escolhida e, para o jogador, sem o que a névoa cobre). */
  chunks: readonly MapChunk[];
  cutaway: Cutaway;
  modelUrls?: ModelUrls;
  loadModel?: ModelLoader;
};

export type GlbExportResult = {
  blob: Blob;
  bytes: number;
  milliseconds: number;
  missingModels: number;
};

export async function exportMapGlb(input: GlbExportInput): Promise<GlbExportResult> {
  const started = performance.now();
  const instances = collectMapInstances(input.chunks, input.cutaway);
  const built = await buildMapObject({
    instances,
    modelUrls: input.modelUrls,
    loadModel: input.loadModel,
  });
  try {
    const output = await new GLTFExporter().parseAsync(built.root, { binary: true });
    if (!(output instanceof ArrayBuffer)) {
      throw new Error('O exportador não gerou o arquivo binário.');
    }
    return {
      blob: new Blob([output], { type: GLB_MIME_TYPE }),
      bytes: output.byteLength,
      milliseconds: performance.now() - started,
      missingModels: built.missingModels,
    };
  } finally {
    built.dispose();
  }
}
