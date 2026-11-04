import {
  brushRect,
  createFogState,
  fillFog,
  fogChunkFromText,
  fogChunkToText,
  isAreaCovered,
  isCellCovered,
  isEmptyFogPlan,
  paintFogRect,
  planFogSave,
  setFogEnabled,
} from './fog';

const BIG = { width: 1000, depth: 1000 };

describe('fog', () => {
  it('shouldCoverAHugeMapWithoutStoringAnyChunk', () => {
    const fog = fillFog(createFogState(BIG, true), true);
    expect(fog.chunks.size).toBe(0);
    expect(isCellCovered(fog, { x: 999, z: 999 })).toBe(true);
  });

  it('shouldHideNothingWhileDisabled', () => {
    const fog = fillFog(createFogState(BIG, false), true);
    expect(isCellCovered(fog, { x: 3, z: 3 })).toBe(false);
    expect(isCellCovered(setFogEnabled(fog, true), { x: 3, z: 3 })).toBe(true);
  });

  it('shouldTreatCellsOutsideTheMapAsCovered', () => {
    const fog = createFogState({ width: 10, depth: 10 }, true);
    expect(isCellCovered(fog, { x: 10, z: 0 })).toBe(true);
    expect(isCellCovered(fog, { x: -1, z: 0 })).toBe(true);
  });

  it('shouldTouchOnlyTheChunksUnderTheRectangle', () => {
    const covered = fillFog(createFogState(BIG, true), true);
    const revealed = paintFogRect(covered, { x: 30, z: 0, width: 4, depth: 2 }, false);
    expect([...revealed.chunks.keys()].sort()).toEqual(['0,0', '1,0']);
    expect(isCellCovered(revealed, { x: 31, z: 1 })).toBe(false);
    expect(isCellCovered(revealed, { x: 34, z: 1 })).toBe(true);
    expect(isCellCovered(covered, { x: 31, z: 1 })).toBe(true);
  });

  it('shouldDropChunksThatReturnToTheDefault', () => {
    const fog = createFogState(BIG, true);
    const painted = paintFogRect(fog, { x: 0, z: 0, width: 2, depth: 2 }, true);
    expect(painted.chunks.size).toBe(1);
    const cleared = paintFogRect(painted, { x: 0, z: 0, width: 2, depth: 2 }, false);
    expect(cleared.chunks.size).toBe(0);
  });

  it('shouldKeepTheSameObjectWhenNothingChanges', () => {
    const fog = createFogState(BIG, true);
    expect(paintFogRect(fog, { x: 0, z: 0, width: 3, depth: 3 }, false)).toBe(fog);
    expect(paintFogRect(fog, { x: 2000, z: 0, width: 3, depth: 3 }, true)).toBe(fog);
  });

  it('shouldKeepBitsOutsideABorderChunkAtZero', () => {
    const fog = fillFog(createFogState({ width: 40, depth: 40 }, true), true);
    const painted = paintFogRect(fog, { x: 35, z: 35, width: 1, depth: 1 }, false);
    const chunk = painted.chunks.get('1,1');
    expect(chunk).toBeDefined();
    // Pedaço de 8×8 casas: 64 bits possíveis, 63 cobertos.
    expect(chunk?.reduce((sum, bit) => sum + bit, 0)).toBe(63);
  });

  it('shouldSeeATokenWhenAnyOfItsCellsIsVisible', () => {
    const fog = paintFogRect(
      fillFog(createFogState(BIG, true), true),
      { x: 5, z: 5, width: 1, depth: 1 },
      false,
    );
    expect(isAreaCovered(fog, { x: 4, z: 4 }, 2)).toBe(false);
    expect(isAreaCovered(fog, { x: 6, z: 6 }, 2)).toBe(true);
  });

  it('shouldRoundTripTheDatabaseBitText', () => {
    const fog = paintFogRect(createFogState(BIG, true), { x: 1, z: 0, width: 1, depth: 1 }, true);
    const text = fogChunkToText(fog.chunks.get('0,0')!);
    expect(text).toHaveLength(1024);
    expect(text.slice(0, 3)).toBe('010');
    expect(fogChunkFromText(text)).toEqual(fog.chunks.get('0,0'));
    expect(fogChunkFromText('01')).toBeNull();
    expect(fogChunkFromText('2'.repeat(1024))).toBeNull();
  });

  it('shouldPlanOnlyTheChunksThatChanged', () => {
    const saved = paintFogRect(createFogState(BIG, true), { x: 0, z: 0, width: 1, depth: 1 }, true);
    const moved = paintFogRect(saved, { x: 100, z: 100, width: 1, depth: 1 }, true);
    const plan = planFogSave(saved, moved);
    expect(plan.reset).toBe(false);
    expect(plan.upserts.map((u) => u.coord)).toEqual([{ cx: 3, cz: 3 }]);
    const back = paintFogRect(moved, { x: 0, z: 0, width: 1, depth: 1 }, false);
    expect(planFogSave(moved, back).deletes).toEqual([{ cx: 0, cz: 0 }]);
    expect(isEmptyFogPlan(saved, planFogSave(saved, saved))).toBe(true);
  });

  it('shouldResetWhenTheDefaultChanges', () => {
    const saved = paintFogRect(createFogState(BIG, true), { x: 0, z: 0, width: 1, depth: 1 }, true);
    const plan = planFogSave(saved, fillFog(saved, true));
    expect(plan).toMatchObject({ reset: true, defaultCovered: true, upserts: [], deletes: [] });
    expect(planFogSave(null, saved).reset).toBe(true);
  });

  it('shouldBuildASquareBrushAroundTheCursor', () => {
    expect(brushRect({ x: 5, z: 5 }, 1)).toEqual({ x: 4, z: 4, width: 3, depth: 3 });
  });
});
