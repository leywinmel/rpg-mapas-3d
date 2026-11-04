/**
 * Gravação em lotes de um mapa grande (o gerado de vila ou cidade, a cópia de um mapa), com
 * progresso. Cada lote é um save_map_v2 próprio: se um falha, o banco fica com um mapa válido
 * (os pedaços gravados até ali, o resto como chão liso) e a nova tentativa manda só o que
 * faltou.
 */
import { createEmptyMap, planSaveSteps, type MapModel } from '@/domain/map-v2';
import type { MapsV2Service } from './map-v2-service';

export type SaveProgress = { readonly done: number; readonly total: number };

export type BatchSaveInput = {
  mapId: string;
  /** O que o banco já tem desse mapa (veja `blankBaseline` para um mapa recém-criado). */
  saved: MapModel;
  current: MapModel;
  onProgress?: (progress: SaveProgress) => void;
  /** Teto de bytes por pedido (os testes usam um pequeno para forçar vários lotes). */
  maxBytes?: number;
};

/** Falha no meio: `saved` é o que já chegou ao banco, para tentar de novo dali. */
export class BatchSaveError extends Error {
  readonly saved: MapModel;

  constructor(saved: MapModel, cause: unknown) {
    super('A gravação em lotes parou no meio.', { cause });
    this.name = 'BatchSaveError';
    this.saved = saved;
  }
}

/** O que o banco tem de um mapa recém-criado com createMapV2: o cabeçalho e nenhum pedaço. */
export function blankBaseline(current: MapModel): MapModel {
  return { ...createEmptyMap(current.size), header: current.header };
}

/** Grava `current` lote a lote e devolve o novo `saved` (o próprio `current`). */
export async function saveMapV2InBatches(
  service: Pick<MapsV2Service, 'saveMapV2'>,
  input: BatchSaveInput,
): Promise<MapModel> {
  const { mapId, current, onProgress } = input;
  const steps = planSaveSteps(input.saved, current, input.maxBytes);
  let saved = input.saved;
  onProgress?.({ done: 0, total: steps.length });
  for (const [index, step] of steps.entries()) {
    try {
      await service.saveMapV2({ mapId, saved, current: step });
    } catch (error) {
      throw new BatchSaveError(saved, error);
    }
    saved = step;
    onProgress?.({ done: index + 1, total: steps.length });
  }
  return saved;
}
