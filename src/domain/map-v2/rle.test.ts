import { decodeRuns, encodeRuns } from './rle';

const spec = { length: 6, maxValue: 3, label: 'Teste' };

function errorsOf(runs: number[], override: Partial<typeof spec> = {}): string[] {
  const result = decodeRuns(runs, { ...spec, ...override });
  return result.ok ? [] : result.errors;
}

describe('runs', () => {
  it('shouldJoinEqualNeighborsInOneRun', () => {
    expect(encodeRuns([1, 1, 1, 2, 2, 1])).toEqual([1, 3, 2, 2, 1, 1]);
    expect(encodeRuns([])).toEqual([]);
    expect(encodeRuns(new Uint8Array(1024))).toEqual([0, 1024]);
  });

  it('shouldRoundTripThroughEncodeAndDecode', () => {
    const values = [0, 0, 3, 3, 3, 1];
    const decoded = decodeRuns(encodeRuns(values), spec);
    expect(decoded).toEqual({ ok: true, value: values });
  });

  it('shouldAcceptNeighborRunsWithTheSameValue', () => {
    // Não é a forma canônica, mas fecha a conta e é válida.
    expect(decodeRuns([2, 4, 2, 2], spec)).toEqual({ ok: true, value: [2, 2, 2, 2, 2, 2] });
  });

  it('shouldRejectRunsNotInPairs', () => {
    expect(errorsOf([1, 3, 2])[0]).toMatch(/em pares/);
  });

  it('shouldRejectCountsThatAreNotPositiveIntegers', () => {
    expect(errorsOf([1, 0, 2, 6])[0]).toMatch(/quantidade 0/);
    expect(errorsOf([1, -2, 2, 8])[0]).toMatch(/quantidade -2/);
    expect(errorsOf([1, 2.5, 2, 3.5])[0]).toMatch(/quantidade 2.5/);
  });

  it('shouldRejectRunsThatDoNotAddUp', () => {
    expect(errorsOf([1, 3, 2, 2])[0]).toMatch(/somam 5 casas, mas o pedaço tem 6/);
    expect(errorsOf([1, 3, 2, 4])[0]).toMatch(/passam das 6 casas/);
    expect(errorsOf([])[0]).toMatch(/somam 0 casas/);
  });

  it('shouldRejectValuesOutsideTheLimit', () => {
    expect(errorsOf([4, 6])[0]).toMatch(/valor 4 está fora do limite de 0 a 3/);
    expect(errorsOf([-1, 6])[0]).toMatch(/valor -1/);
    expect(errorsOf([1.5, 6])[0]).toMatch(/valor 1.5/);
  });

  it('shouldNotBuildHugeArraysForAbsurdCounts', () => {
    // Uma quantidade absurda precisa falhar antes de gastar memória.
    expect(errorsOf([0, 1_000_000_000])[0]).toMatch(/passam das 6 casas/);
  });

  it('shouldNameWhatWasBeingRead', () => {
    expect(errorsOf([9, 6], { label: 'Terreno (alturas)' })[0]).toMatch(/^Terreno \(alturas\):/);
  });
});
