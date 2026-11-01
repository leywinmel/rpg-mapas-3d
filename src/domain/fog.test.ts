import {
  byteLengthFor,
  countCovered,
  createFog,
  fogFromBytea,
  fogToBytea,
  isCovered,
  paintRect,
} from './fog';

describe('fog', () => {
  it('shouldFitA100By100MapIn1250Bytes', () => {
    expect(byteLengthFor({ width: 100, depth: 100 })).toBe(1250);
  });

  it('shouldStartFullyCoveredWithoutPhantomCells', () => {
    const fog = createFog({ width: 3, depth: 3 }, true);
    expect(countCovered(fog)).toBe(9);
    expect(isCovered(fog, { x: 2, z: 2 })).toBe(true);
  });

  it('shouldRevealAndCoverRectanglesWithoutMutating', () => {
    const covered = createFog({ width: 10, depth: 10 }, true);
    const revealed = paintRect(covered, { x: 0, z: 0 }, { x: 2, z: 1 }, false);
    expect(countCovered(covered)).toBe(100);
    expect(countCovered(revealed)).toBe(94);
    expect(isCovered(revealed, { x: 1, z: 1 })).toBe(false);
    expect(isCovered(revealed, { x: 3, z: 0 })).toBe(true);
  });

  it('shouldTreatCellsOutsideTheMapAsVisible', () => {
    const fog = createFog({ width: 2, depth: 2 }, true);
    expect(isCovered(fog, { x: 5, z: 5 })).toBe(false);
  });

  it('shouldMatchPostgresGetBitConvention', () => {
    // Casa (0, 9) num mapa 10×10 = bit 90 = byte 11, bit 2 → 0x04 (igual ao teste do banco).
    const fog = paintRect(
      createFog({ width: 10, depth: 10 }, false),
      { x: 0, z: 9 },
      { x: 0, z: 9 },
      true,
    );
    expect(fog.bits[11]).toBe(0x04);
    expect(fogToBytea(fog).startsWith('\\x0000')).toBe(true);
  });

  it('shouldRoundTripThroughBytea', () => {
    const size = { width: 7, depth: 5 };
    const fog = paintRect(createFog(size, false), { x: 1, z: 1 }, { x: 4, z: 3 }, true);
    const restored = fogFromBytea(size, fogToBytea(fog));
    expect(Array.from(restored.bits)).toEqual(Array.from(fog.bits));
  });

  it('shouldRejectCorruptedBytea', () => {
    expect(() => fogFromBytea({ width: 2, depth: 2 }, '\\xZZ')).toThrow();
    expect(countCovered(fogFromBytea({ width: 2, depth: 2 }, null))).toBe(0);
  });
});
