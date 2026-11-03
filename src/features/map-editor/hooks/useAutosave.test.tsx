// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { createEmptyMap, paintTerrainCell, type MapModel } from '@/domain/map-v2';
import { setLogSink } from '@/lib/logger';
import type { SaveMapV2Input } from '../services/map-v2-service';
import { AUTOSAVE_DELAY_MS, useAutosave } from './useAutosave';

const SIZE = { width: 3, depth: 3 };
const LOADED = createEmptyMap(SIZE);

type Save = (input: SaveMapV2Input) => Promise<unknown>;

function paint(model: MapModel, x: number, tile: string): MapModel {
  const result = paintTerrainCell(model, { cell: { x, z: 0 }, tile });
  if (!result.ok) throw new Error(result.errors.join(' | '));
  return result.value;
}

function setup(save: Save, stored: MapModel | null = LOADED) {
  return renderHook(
    ({ model }: { model: MapModel }) =>
      useAutosave({ mapId: 'm1', model, loaded: LOADED, stored, save }),
    { initialProps: { model: LOADED } },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  setLogSink(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

async function waitForSave() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
  });
}

describe('useAutosave', () => {
  it('shouldWaitForAPauseAndSaveOnlyTheLatestMapAgainstTheStoredOne', async () => {
    const save = vi.fn<Save>(async () => '2026-11-03T00:00:00Z');
    const { result, rerender } = setup(save);
    expect(result.current.status).toBe('saved');

    const first = paint(LOADED, 0, 'grama');
    rerender({ model: first });
    expect(result.current.status).toBe('dirty');
    const second = paint(first, 1, 'grama');
    rerender({ model: second });

    await waitForSave();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ mapId: 'm1', saved: LOADED, current: second });
    expect(result.current.status).toBe('saved');

    // A próxima gravação parte do que acabou de ir ao banco: só o pedaço novo vai.
    const third = paint(second, 2, 'agua');
    rerender({ model: third });
    await waitForSave();
    expect(save).toHaveBeenLastCalledWith({ mapId: 'm1', saved: second, current: third });
  });

  it('shouldSendTheWholeMapWhenItIsStillStoredAsV1', async () => {
    const save = vi.fn<Save>(async () => null);
    const { rerender } = setup(save, null);
    const changed = paint(LOADED, 0, 'terra');
    rerender({ model: changed });
    await waitForSave();
    expect(save).toHaveBeenCalledWith({ mapId: 'm1', saved: null, current: changed });
  });

  it('shouldReportAnErrorWhenTheSaveFails', async () => {
    const save = vi.fn<Save>(async () => {
      throw new Error('offline');
    });
    const { result, rerender } = setup(save);
    rerender({ model: paint(LOADED, 2, 'agua') });
    await waitForSave();
    expect(result.current.status).toBe('error');
  });

  it('shouldShowSavedAfterUndoingBackToTheLoadedMap', () => {
    const save = vi.fn<Save>(async () => null);
    const { result, rerender } = setup(save);
    rerender({ model: paint(LOADED, 0, 'grama') });
    expect(result.current.status).toBe('dirty');
    rerender({ model: LOADED });
    expect(result.current.status).toBe('saved');
  });
});
