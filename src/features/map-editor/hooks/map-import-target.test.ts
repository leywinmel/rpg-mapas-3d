import { describe, expect, it, vi } from 'vitest';
import { createEmptyMap } from '@/domain/map-v2';
import { BatchSaveError } from '../services/batch-save';
import type { MapSummary } from '../types';
import { createMapImportTarget } from './map-import-target';
import { PartialMapError } from './useMapActions';

const model = createEmptyMap({ width: 64, depth: 64 });
const summary = { id: 'mapa-1', name: 'Vila' } as MapSummary;
const halfway = createEmptyMap({ width: 64, depth: 64 });

function actions() {
  return {
    createFromModel: vi.fn(async () => summary),
    resumeSave: vi.fn(async () => model),
    remove: vi.fn(async () => undefined),
  };
}

const onProgress = () => undefined;

describe('createMapImportTarget', () => {
  it('shouldCreateTheMapFromTheModel', async () => {
    const fake = actions();
    const target = createMapImportTarget(fake);

    await expect(target.saveMap({ name: 'Vila', model, onProgress })).resolves.toBe('mapa-1');
    expect(fake.createFromModel).toHaveBeenCalledWith({ name: 'Vila', model, onProgress });
  });

  it('shouldResumeFromWhereTheBatchesStoppedInsteadOfCreatingAgain', async () => {
    const fake = actions();
    fake.createFromModel.mockRejectedValueOnce(
      new PartialMapError(summary, new BatchSaveError(halfway, new Error('rede'))),
    );
    const target = createMapImportTarget(fake);

    await expect(target.saveMap({ name: 'Vila', model, onProgress })).rejects.toThrow();
    await expect(target.saveMap({ name: 'Vila', model, onProgress })).resolves.toBe('mapa-1');

    expect(fake.createFromModel).toHaveBeenCalledTimes(1);
    expect(fake.resumeSave).toHaveBeenCalledWith({
      mapId: 'mapa-1',
      saved: halfway,
      current: model,
      onProgress,
    });
  });

  it('shouldKeepTheLatestSavedStepWhenTheResumeFailsAgain', async () => {
    const fake = actions();
    const further = createEmptyMap({ width: 64, depth: 64 });
    fake.createFromModel.mockRejectedValueOnce(
      new PartialMapError(summary, new BatchSaveError(halfway, new Error('rede'))),
    );
    fake.resumeSave.mockRejectedValueOnce(new BatchSaveError(further, new Error('rede')));
    const target = createMapImportTarget(fake);

    await expect(target.saveMap({ name: 'Vila', model, onProgress })).rejects.toThrow();
    await expect(target.saveMap({ name: 'Vila', model, onProgress })).rejects.toThrow();
    await target.saveMap({ name: 'Vila', model, onProgress });

    expect(fake.resumeSave).toHaveBeenLastCalledWith(expect.objectContaining({ saved: further }));
  });

  it('shouldDeleteTheCreatedMapOnDiscard', async () => {
    const fake = actions();
    fake.createFromModel.mockRejectedValueOnce(
      new PartialMapError(summary, new BatchSaveError(halfway, new Error('rede'))),
    );
    const target = createMapImportTarget(fake);
    await expect(target.saveMap({ name: 'Vila', model, onProgress })).rejects.toThrow();

    await target.discard();

    expect(fake.remove).toHaveBeenCalledWith('mapa-1');
  });

  it('shouldDoNothingOnDiscardWhenNoMapWasCreated', async () => {
    const fake = actions();
    fake.createFromModel.mockRejectedValueOnce(new Error('sem rede'));
    const target = createMapImportTarget(fake);
    await expect(target.saveMap({ name: 'Vila', model, onProgress })).rejects.toThrow();

    await target.discard();

    expect(fake.remove).not.toHaveBeenCalled();
  });
});
