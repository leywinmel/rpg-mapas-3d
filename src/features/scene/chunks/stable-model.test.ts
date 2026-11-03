import { describe, expect, it } from 'vitest';
import { createEmptyDocument, type MapDocument } from '@/domain';
import { convertMapV1ToV2, type MapModel } from '@/domain/map-v2';
import { reuseUnchangedChunks, sameChunkContent } from './stable-model';

const size = { width: 70, depth: 40 };

function convert(document: MapDocument): MapModel {
  const result = convertMapV1ToV2(document, size);
  if (!result.ok) throw new Error(result.errors.join(' | '));
  return result.value;
}

const base = createEmptyDocument(size);

describe('reusing unchanged chunks after a v1 edit', () => {
  it('shouldReturnThePreviousModelWhenNothingChanged', () => {
    const before = convert(base);
    expect(reuseUnchangedChunks(before, convert(base))).toBe(before);
  });

  it('shouldKeepEveryChunkButTheOneThatWasPainted', () => {
    const before = convert(base);
    const painted: MapDocument = {
      ...base,
      floors: base.floors.map((floor) =>
        floor.x === 40 && floor.z === 35 ? { ...floor, height: 3 } : floor,
      ),
    };
    const after = reuseUnchangedChunks(before, convert(painted));
    const changed = [...after.chunks].filter(([key, chunk]) => before.chunks.get(key) !== chunk);
    expect(changed.map(([key]) => key)).toEqual(['1,1']);
  });

  it('shouldNoticeAPieceThatMovedOrTurned', () => {
    const prop = {
      id: 'b',
      asset: { source: 'catalog', key: 'barril' },
      x: 1.5,
      z: 1.5,
      elevation: 0,
      rotation: 0,
      scale: 1,
    } as const;
    const a = convert({ ...base, props: [prop] }).chunks.get('0,0')!;
    const b = convert({ ...base, props: [{ ...prop, rotation: 90 }] }).chunks.get('0,0')!;
    expect(sameChunkContent(a, convert({ ...base, props: [prop] }).chunks.get('0,0')!)).toBe(true);
    expect(sameChunkContent(a, b)).toBe(false);
  });

  it('shouldKeepTheChunksButTakeTheNewAmbience', () => {
    const before = convert(base);
    const after = reuseUnchangedChunks(
      before,
      convert({ ...base, ambience: { ...base.ambience, light: 1 } }),
    );
    expect(after).not.toBe(before);
    expect(after.header.ambience.light).toBe(1);
    expect(after.chunks.get('0,0')).toBe(before.chunks.get('0,0'));
  });

  it('shouldStartFromTheNewModelWithoutAPreviousOne', () => {
    const next = convert(base);
    expect(reuseUnchangedChunks(null, next)).toBe(next);
  });
});
