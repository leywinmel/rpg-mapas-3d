// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { createEmptyDocument, type MapDocument } from '@/domain';
import { setLogSink } from '@/lib/logger';
import { setFloorTile } from '../editor/document-ops';
import { AUTOSAVE_DELAY_MS, useAutosave } from './useAutosave';

const SIZE = { width: 3, depth: 3 };
const BASELINE = createEmptyDocument(SIZE);

function setup(save: (mapId: string, document: MapDocument) => Promise<void>) {
  return renderHook(
    ({ document }: { document: MapDocument }) =>
      useAutosave({ mapId: 'm1', size: SIZE, document, baseline: BASELINE, save }),
    { initialProps: { document: BASELINE } },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  setLogSink(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutosave', () => {
  it('shouldWaitForAPauseAndSaveOnlyTheLatestDocument', async () => {
    const save = vi.fn(async () => undefined);
    const { result, rerender } = setup(save);
    expect(result.current.status).toBe('saved');

    const first = setFloorTile(BASELINE, SIZE, { cell: { x: 0, z: 0 }, tile: 'grama' });
    rerender({ document: first });
    expect(result.current.status).toBe('dirty');
    const second = setFloorTile(first, SIZE, { cell: { x: 1, z: 0 }, tile: 'grama' });
    rerender({ document: second });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('m1', second);
    expect(result.current.status).toBe('saved');
  });

  it('shouldReportAnErrorWhenTheSaveFails', async () => {
    const save = vi.fn(async () => {
      throw new Error('offline');
    });
    const { result, rerender } = setup(save);
    rerender({ document: setFloorTile(BASELINE, SIZE, { cell: { x: 2, z: 2 }, tile: 'agua' }) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
    });
    expect(result.current.status).toBe('error');
  });

  it('shouldNeverSaveADocumentThatFailsValidation', async () => {
    const save = vi.fn(async () => undefined);
    const { result, rerender } = setup(save);
    const broken = { ...BASELINE, floors: [{ x: 99, z: 99, tile: 'grama', height: 0 }] };
    rerender({ document: broken });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
    });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
  });
});
