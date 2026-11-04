import { DataTexture, NearestFilter, RGBAFormat } from 'three';
import { FOG_COVERED, type FogState } from '@/domain';
import { CHUNK_SIZE, chunkBounds, chunkKey, listChunks } from '@/domain/map-v2';

/** Bytes por casa na textura RGBA. */
const CHANNELS = 4;
const OPAQUE = 255;

export type FogColor = { r: number; g: number; b: number };

/**
 * Pixels da névoa: uma casa por pixel, opaca quando coberta e transparente quando à vista. A
 * linha 0 da textura é a borda z = profundidade - 1 (o plano deitado inverte o eixo).
 */
export function fillFogPixels(fog: FogState, color: FogColor, pixels: Uint8Array): void {
  const { width, depth } = fog.size;
  for (let index = 0; index < width * depth; index += 1) {
    const offset = index * CHANNELS;
    pixels[offset] = color.r;
    pixels[offset + 1] = color.g;
    pixels[offset + 2] = color.b;
    pixels[offset + 3] = 0;
  }
  if (!fog.enabled) return;
  // Pedaço a pedaço: o pedaço ausente vale o padrão, sem consultar casa por casa.
  for (const coord of listChunks(fog.size)) {
    const chunk = fog.chunks.get(chunkKey(coord));
    if (!chunk && !fog.defaultCovered) continue;
    const bounds = chunkBounds(fog.size, coord);
    for (let dz = 0; dz < bounds.depth; dz += 1) {
      const row = (depth - 1 - (bounds.z + dz)) * width + bounds.x;
      for (let dx = 0; dx < bounds.width; dx += 1) {
        const covered = chunk ? chunk[dz * CHUNK_SIZE + dx] === FOG_COVERED : true;
        if (covered) pixels[(row + dx) * CHANNELS + 3] = OPAQUE;
      }
    }
  }
}

export function fogPixelCount(fog: FogState): number {
  return fog.size.width * fog.size.depth * CHANNELS;
}

/** Textura de uma casa por pixel, sem suavizar: a borda da névoa fica na borda da casa. */
export function createFogTexture(width: number, depth: number): DataTexture {
  const texture = new DataTexture(
    new Uint8Array(width * depth * CHANNELS),
    width,
    depth,
    RGBAFormat,
  );
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** Repinta a textura com a névoa atual (mesmo tamanho; outro tamanho ganha textura nova). */
export function paintFogTexture(texture: DataTexture, fog: FogState, color: FogColor): void {
  const pixels: unknown = texture.image.data;
  if (!(pixels instanceof Uint8Array) || pixels.length !== fogPixelCount(fog)) return;
  fillFogPixels(fog, color, pixels);
  texture.needsUpdate = true;
}
