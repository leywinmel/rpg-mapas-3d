import { describe, expect, it } from 'vitest';
import { serializeChunk } from './document';
import { createEmptyMap, getChunk } from './model';
import { paintTerrainRect } from './operations';
import { resizeMap } from './resize';
import { planSaveSteps } from './save-steps';
import { isEmptySavePlan, planMapSave } from './storage';
import { unwrap } from './test-fixtures';

// 96×64 casas: 3×2 = 6 pedaços, todos pintados de grama.
const size = { width: 96, depth: 64 };
const saved = createEmptyMap(size);
const current = unwrap(
  paintTerrainRect(saved, { from: { x: 0, z: 0 }, to: { x: 95, z: 63 }, tile: 'grama' }),
);

describe('planSaveSteps', () => {
  it('shouldSendEachChunkOnceAndEndOnTheCurrentMap', () => {
    const steps = planSaveSteps(saved, current, 1);
    expect(steps).toHaveLength(6);
    expect(steps.at(-1)).toBe(current);
    let previous = saved;
    const sent: string[] = [];
    for (const step of steps) {
      const plan = planMapSave(previous, step);
      expect(plan.upserts).toHaveLength(1);
      sent.push(...plan.upserts.map(({ coord }) => `${coord.cx},${coord.cz}`));
      previous = step;
    }
    expect(new Set(sent).size).toBe(6);
  });

  it('shouldGroupSmallChunksUnderTheByteLimit', () => {
    expect(planSaveSteps(saved, current)).toEqual([current]);
    // Todos os pedaços pintados têm o mesmo tamanho: cabem dois por passo.
    const oneChunk = JSON.stringify(serializeChunk(getChunk(current, { cx: 0, cz: 0 }))).length;
    expect(planSaveSteps(saved, current, oneChunk * 2)).toHaveLength(3);
  });

  it('shouldResumeFromTheLastSavedStep', () => {
    const steps = planSaveSteps(saved, current, 1);
    const resumed = planSaveSteps(steps[2]!, current, 1);
    expect(resumed).toHaveLength(3);
    expect(isEmptySavePlan(planMapSave(resumed.at(-1)!, current))).toBe(true);
  });

  it('shouldSaveAResizeInOneStep', () => {
    const smaller = unwrap(resizeMap(current, { width: 40, depth: 40 }));
    expect(planSaveSteps(saved, smaller, 1)).toEqual([smaller]);
  });

  it('shouldStillSaveTheHeaderWhenNoChunkChanged', () => {
    expect(planSaveSteps(saved, saved)).toEqual([saved]);
  });
});
