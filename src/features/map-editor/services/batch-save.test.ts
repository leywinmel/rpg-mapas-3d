import { describe, expect, it, vi } from 'vitest';
import { generateSettlement } from '@/domain/map-gen';
import { isEmptySavePlan, planMapSave, type MapModel } from '@/domain/map-v2';
import { BatchSaveError, blankBaseline, saveMapV2InBatches } from './batch-save';
import type { SaveMapV2Input } from './map-v2-service';

const MAP_ID = '00000000-0000-4000-8000-000000000001';
const { model: town } = generateSettlement({
  style: 'medieval',
  size: { width: 96, depth: 96 },
  seed: 3,
});
/** Lotes pequenos: cada pedaço da vila vai num pedido. */
const ONE_CHUNK = 1;

/** Banco de mentira: guarda o último `current` gravado, como o save_map_v2 faria. */
function fakeService(failOn: number | null = null) {
  let stored: MapModel | null = null;
  let calls = 0;
  const saveMapV2 = vi.fn(async ({ saved, current }: SaveMapV2Input) => {
    calls += 1;
    if (calls === failOn) throw new Error('rede caiu');
    // Cada pedido parte do que o banco tem de verdade (nada se perde nem se repete).
    if (stored) expect(saved).toBe(stored);
    stored = current;
    return 'agora';
  });
  return { service: { saveMapV2 }, stored: () => stored };
}

describe('saveMapV2InBatches', () => {
  it('shouldSaveChunkByChunkAndReportProgress', async () => {
    const { service, stored } = fakeService();
    const progress: string[] = [];
    const saved = await saveMapV2InBatches(service, {
      mapId: MAP_ID,
      saved: blankBaseline(town),
      current: town,
      maxBytes: ONE_CHUNK,
      onProgress: ({ done, total }) => progress.push(`${done}/${total}`),
    });
    expect(saved).toBe(town);
    expect(stored()).toBe(town);
    expect(service.saveMapV2).toHaveBeenCalledTimes(9);
    expect(progress[0]).toBe('0/9');
    expect(progress.at(-1)).toBe('9/9');
  });

  it('shouldStopOnAFailureAndResumeOnlyWithWhatIsMissing', async () => {
    const failing = fakeService(4);
    const error = await saveMapV2InBatches(failing.service, {
      mapId: MAP_ID,
      saved: blankBaseline(town),
      current: town,
      maxBytes: ONE_CHUNK,
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BatchSaveError);
    const partial = (error as BatchSaveError).saved;
    expect(partial).toBe(failing.stored());
    expect(planMapSave(partial, town).upserts).toHaveLength(6);

    const retry = fakeService();
    await saveMapV2InBatches(retry.service, {
      mapId: MAP_ID,
      saved: partial,
      current: town,
      maxBytes: ONE_CHUNK,
    });
    expect(retry.service.saveMapV2).toHaveBeenCalledTimes(6);
    expect(isEmptySavePlan(planMapSave(retry.stored()!, town))).toBe(true);
  });
});
