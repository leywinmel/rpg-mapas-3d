/**
 * Gravar um mapa grande em vários pedidos. Um mapa gerado de 1000×1000 passa de 80 MB de
 * JSON: num pedido só, ele estoura o tempo do banco e não mostra progresso. Aqui a gravação
 * de `saved` para `current` vira uma fila de passos, e cada passo é um mapa que já tem um
 * lote a mais de pedaços de `current`. Gravar passo a passo com planMapSave manda só o lote
 * novo; se um pedido falha, o passo anterior diz exatamente o que o banco já tem, e a nova
 * tentativa recomeça dali.
 */
import { serializeChunk } from './document';
import { withChunks } from './chunk-edit';
import { chunkKey } from './chunks';
import { changedChunks, getChunk, isDefaultChunk } from './model';
import type { MapChunk, MapModel } from './types';

/** Teto de cada pedido: folgado para o tempo do banco e para o limite de corpo da API. */
export const SAVE_STEP_BYTES = 2_000_000;
/** Um pedaço que voltou a ser liso só manda as coordenadas para apagar a linha. */
const DELETE_BYTES = 32;

function chunkBytes(chunk: MapChunk): number {
  return isDefaultChunk(chunk) ? DELETE_BYTES : JSON.stringify(serializeChunk(chunk)).length;
}

/**
 * Os passos para o banco sair de `saved` e chegar em `current`, cada um com até `maxBytes` de
 * pedaços novos (um pedaço maior que o teto vai sozinho). O último passo é o próprio
 * `current`. Mudança de tamanho vai num passo só, porque o banco apaga os pedaços de fora
 * junto com ela.
 */
export function planSaveSteps(
  saved: MapModel,
  current: MapModel,
  maxBytes: number = SAVE_STEP_BYTES,
): MapModel[] {
  const sameSize =
    saved.size.width === current.size.width && saved.size.depth === current.size.depth;
  if (!sameSize) return [current];
  const steps: MapModel[] = [];
  let previous: MapModel = { ...saved, header: current.header };
  let batch = new Map<string, MapChunk>();
  let bytes = 0;
  for (const coord of changedChunks(saved, current)) {
    const chunk = getChunk(current, coord);
    const size = chunkBytes(chunk);
    if (batch.size > 0 && bytes + size > maxBytes) {
      previous = withChunks(previous, batch);
      steps.push(previous);
      batch = new Map();
      bytes = 0;
    }
    batch.set(chunkKey(coord), chunk);
    bytes += size;
  }
  steps.push(current);
  return steps;
}
