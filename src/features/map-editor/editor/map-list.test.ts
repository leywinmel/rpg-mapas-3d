import { describe, expect, it } from 'vitest';
import type { MapSummary } from '../types';
import { copyName, MAX_MAP_NAME_LENGTH, moveMap, nextSortOrder, parseNewMap } from './map-list';

function summary(id: string, sortOrder: number): MapSummary {
  return { id, name: id, width: 10, depth: 10, sortOrder, updatedAt: '2026-11-01T00:00:00Z' };
}

describe('map-list', () => {
  it('shouldAcceptAValidNewMapFromTheFormStrings', () => {
    const result = parseNewMap({ name: '  Cripta  ', width: '20', depth: '100', floor: 'grama' });
    expect(result).toEqual({
      ok: true,
      value: { name: 'Cripta', width: 20, depth: 100, floor: 'grama' },
    });
  });

  it('shouldExplainEachInvalidField', () => {
    const result = parseNewMap({ name: ' ', width: '0', depth: '101', floor: 'barril' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['depth', 'floor', 'name', 'width']);
    expect(result.errors.width).toMatch(/mínimo/);
  });

  it('shouldKeepTheCopyNameWithinTheLimit', () => {
    expect(copyName('Cripta')).toBe('Cripta (cópia)');
    expect(copyName('x'.repeat(MAX_MAP_NAME_LENGTH))).toHaveLength(MAX_MAP_NAME_LENGTH);
  });

  it('shouldPutNewMapsAtTheEnd', () => {
    expect(nextSortOrder([])).toBe(0);
    expect(nextSortOrder([summary('a', 0), summary('b', 4)])).toBe(5);
  });

  it('shouldSwapNeighboursAndRenumberTies', () => {
    const maps = [summary('a', 0), summary('b', 0), summary('c', 0)];
    expect(moveMap(maps, 'c', 'up')).toEqual([
      { id: 'c', sortOrder: 1 },
      { id: 'b', sortOrder: 2 },
    ]);
    expect(moveMap(maps, 'a', 'up')).toEqual([]);
    expect(moveMap(maps, 'c', 'down')).toEqual([]);
  });
});
