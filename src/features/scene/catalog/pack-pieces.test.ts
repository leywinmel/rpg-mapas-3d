import { describe, expect, it } from 'vitest';
import { MAX_FOOTPRINT } from '@/domain/map-v2';
import { PACK_PIECES } from './pack-pieces';

// O Vite lista e lê os arquivos de public/ sem precisar de API do Node no teste.
const SHIPPED = new Set(
  Object.keys(import.meta.glob('/public/assets/**/*.{bin,webp}')).map((path) =>
    path.replace('/public', ''),
  ),
);
const GLTF_SOURCES = import.meta.glob<string>('/public/assets/**/*.gltf', {
  query: '?raw',
  import: 'default',
  eager: true,
});

type GltfJson = { buffers?: { uri?: string }[]; images?: { uri?: string }[] };

function modelUrl(entry: (typeof PACK_PIECES)[number]): string {
  if (entry.visual.type !== 'model') throw new Error(`${entry.key} não é modelo`);
  return entry.visual.url;
}

describe('peças dos pacotes', () => {
  it('shouldKeepEveryFootprintInsideTheMapLimit', () => {
    for (const entry of PACK_PIECES) {
      const footprint = entry.footprint ?? { width: 1, depth: 1 };
      expect(footprint.width, entry.key).toBeLessThanOrEqual(MAX_FOOTPRINT);
      expect(footprint.depth, entry.key).toBeLessThanOrEqual(MAX_FOOTPRINT);
    }
  });

  it('shouldShipModelBuffersTexturesAndThumbnailForEveryPiece', () => {
    for (const entry of PACK_PIECES) {
      const url = modelUrl(entry);
      const folder = url.slice(0, url.lastIndexOf('/') + 1);
      const source = GLTF_SOURCES[`/public${url}`];
      expect(source, entry.key).toBeDefined();
      const gltf = JSON.parse(source ?? '{}') as GltfJson;
      const linked = [...(gltf.buffers ?? []), ...(gltf.images ?? [])];
      for (const { uri } of linked) {
        if (!uri) continue;
        expect(SHIPPED.has(folder + uri), `${entry.key}: ${uri}`).toBe(true);
      }
      expect(SHIPPED.has(entry.thumbnail ?? ''), entry.key).toBe(true);
    }
  });

  it('shouldStackPackWallsOneStoryAtATime', () => {
    const walls = PACK_PIECES.filter((entry) => entry.kind === 'wall');
    expect(walls.length).toBeGreaterThan(0);
    for (const wall of walls) expect(wall.wallSpan, wall.key).toBeGreaterThan(1);
  });
});
