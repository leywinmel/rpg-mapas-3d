import { measureCells } from '@/domain';
import { formatMeasurement } from './format';

describe('formatMeasurement', () => {
  it('shouldUseSingularForOneCell', () => {
    expect(formatMeasurement(measureCells({ x: 0, z: 0 }, { x: 1, z: 1 }))).toBe('1 casa · 1,5 m');
  });

  it('shouldUsePlainMetersWhenRound', () => {
    expect(formatMeasurement(measureCells({ x: 0, z: 0 }, { x: 4, z: 0 }))).toBe('4 casas · 6 m');
  });

  it('shouldShowZeroOnTheSameCell', () => {
    expect(formatMeasurement({ cells: 0, meters: 0 })).toBe('0 casas · 0 m');
  });
});
