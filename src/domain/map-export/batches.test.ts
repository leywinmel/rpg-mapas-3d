import { describe, expect, it } from 'vitest';
import { createEmptyMap, serializeChunk, type SerializedChunk } from '../map-v2';
import { chunkByteSize, planChunkBatches } from './batches';

const model = createEmptyMap({ width: 200, depth: 64 });
const chunks: SerializedChunk[] = [...model.chunks.values()].map((chunk) => ({
  coord: chunk.coord,
  document: serializeChunk(chunk),
}));

describe('planChunkBatches', () => {
  it('respeita o teto de pedaços', () => {
    const batches = planChunkBatches(chunks, { maxBytes: 1_000_000, maxChunks: 5 });
    expect(batches.map((batch) => batch.length)).toEqual([5, 5, 4]);
    expect(batches.flat()).toEqual(chunks);
  });

  it('respeita o teto de bytes', () => {
    const one = chunkByteSize(chunks[0]!);
    const batches = planChunkBatches(chunks, { maxBytes: one * 3, maxChunks: 100 });
    expect(batches.every((batch) => batch.length <= 3)).toBe(true);
    expect(batches.flat()).toHaveLength(chunks.length);
  });

  it('pedaço maior que o teto vai sozinho', () => {
    const batches = planChunkBatches(chunks.slice(0, 3), { maxBytes: 1, maxChunks: 100 });
    expect(batches.map((batch) => batch.length)).toEqual([1, 1, 1]);
  });

  it('sem pedaços, sem lotes', () => {
    expect(planChunkBatches([])).toEqual([]);
  });
});
