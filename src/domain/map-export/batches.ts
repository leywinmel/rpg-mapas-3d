/**
 * Lotes da importação: os pedaços de um mapa grande vão ao banco em várias gravações, cada uma
 * abaixo de um teto de bytes e de pedaços. Assim um mapa de dezenas de MB não vira um pedido
 * único gigante, e uma falha no meio recomeça do lote que caiu, não do zero.
 */
import type { SerializedChunk } from '../map-v2';
import { IMPORT_BATCH_MAX_BYTES, IMPORT_BATCH_MAX_CHUNKS } from './constants';

export type BatchLimits = { readonly maxBytes: number; readonly maxChunks: number };

export const DEFAULT_BATCH_LIMITS: BatchLimits = {
  maxBytes: IMPORT_BATCH_MAX_BYTES,
  maxChunks: IMPORT_BATCH_MAX_CHUNKS,
};

const encoder = new TextEncoder();

/** Bytes do documento como ele vai no corpo do pedido (JSON em UTF-8). */
export function chunkByteSize(chunk: SerializedChunk): number {
  return encoder.encode(JSON.stringify(chunk.document)).length;
}

/**
 * Agrupa os pedaços em ordem. Um pedaço sozinho maior que o teto ainda vai, num lote só dele:
 * o banco é quem o recusa (com a mensagem dele), e nada fica preso para sempre aqui.
 */
export function planChunkBatches(
  chunks: readonly SerializedChunk[],
  limits: BatchLimits = DEFAULT_BATCH_LIMITS,
): SerializedChunk[][] {
  const batches: SerializedChunk[][] = [];
  let current: SerializedChunk[] = [];
  let bytes = 0;
  for (const chunk of chunks) {
    const size = chunkByteSize(chunk);
    const full = current.length >= limits.maxChunks || bytes + size > limits.maxBytes;
    if (current.length > 0 && full) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(chunk);
    bytes += size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}
