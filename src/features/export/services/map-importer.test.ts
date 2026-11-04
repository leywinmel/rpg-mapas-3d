import { describe, expect, it, vi } from 'vitest';
import { createFogState } from '@/domain';
import type { FileToken, ImportedMap } from '@/domain/map-export';
import { createEmptyMap } from '@/domain/map-v2';
import {
  createImportJob,
  type ImportProgress,
  type MapImportTarget,
  type TableImportTarget,
} from './map-importer';

const MAP_ID = 'mapa-novo';
const size = { width: 40, depth: 40 };

function token(name: string): FileToken {
  return {
    name,
    kind: 'model',
    imagePath: null,
    modelKey: 'figure',
    colorPrimary: null,
    colorSecondary: null,
    x: 1,
    z: 1,
    size: 1,
    level: 0,
    hpCurrent: 5,
    hpMax: 10,
    notes: '',
    hidden: false,
  };
}

function imported(): ImportedMap {
  return {
    name: 'Vila',
    model: createEmptyMap(size),
    tokens: [token('Ana'), token('Bia'), token('Caio')],
    fog: createFogState(size),
    legacy: false,
  };
}

function mapTarget(): MapImportTarget & { saveMap: ReturnType<typeof vi.fn> } {
  return {
    saveMap: vi.fn(async ({ onProgress }) => {
      onProgress({ done: 1, total: 1 });
      return MAP_ID;
    }),
    discard: vi.fn(async () => undefined),
  };
}

function tableTarget(failOnToken: string | null = null) {
  const created: string[] = [];
  let failed = false;
  const table: TableImportTarget = {
    saveFog: vi.fn(async () => undefined),
    createToken: vi.fn(async ({ token: item, onCreated, previousId }) => {
      if (!previousId) {
        created.push(item.name);
        onCreated(`id-${item.name}`);
      }
      if (item.name === failOnToken && !failed) {
        failed = true;
        throw new Error('caiu depois de criar');
      }
      return 'created' as const;
    }),
  };
  return { table, created };
}

const ALL = { name: 'Vila importada', includeTokens: true, includeFog: true };

describe('createImportJob', () => {
  it('shouldSaveMapThenFogThenTokensInOrder', async () => {
    const map = mapTarget();
    const { table, created } = tableTarget();
    const stages: string[] = [];
    const job = createImportJob({ imported: imported(), choice: ALL, map, table });

    const outcome = await job.run((progress: ImportProgress) => stages.push(progress.stage));

    expect(outcome).toEqual({ mapId: MAP_ID, fallbackTokens: 0 });
    expect(map.saveMap).toHaveBeenCalledWith(expect.objectContaining({ name: 'Vila importada' }));
    expect(table.saveFog).toHaveBeenCalledWith(MAP_ID, expect.anything());
    expect(created).toEqual(['Ana', 'Bia', 'Caio']);
    expect(stages.indexOf('fog')).toBeGreaterThan(stages.lastIndexOf('map'));
    expect(stages.at(-1)).toBe('done');
  });

  it('shouldSkipFogAndTokensWhenNotChosen', async () => {
    const map = mapTarget();
    const { table } = tableTarget();
    const job = createImportJob({
      imported: imported(),
      choice: { ...ALL, includeTokens: false, includeFog: false },
      map,
      table,
    });

    await job.run(() => undefined);

    expect(table.saveFog).not.toHaveBeenCalled();
    expect(table.createToken).not.toHaveBeenCalled();
  });

  it('shouldResumeFromTheFailedTokenWithoutDuplicating', async () => {
    const map = mapTarget();
    const { table, created } = tableTarget('Bia');
    const job = createImportJob({ imported: imported(), choice: ALL, map, table });

    await expect(job.run(() => undefined)).rejects.toThrow('caiu depois de criar');
    await job.run(() => undefined);

    expect(map.saveMap).toHaveBeenCalledTimes(1);
    expect(table.saveFog).toHaveBeenCalledTimes(1);
    expect(created).toEqual(['Ana', 'Bia', 'Caio']);
    expect(table.createToken).toHaveBeenCalledWith(
      expect.objectContaining({ previousId: 'id-Bia' }),
    );
  });

  it('shouldRetryTheMapStepWhenSavingTheMapFails', async () => {
    const map = mapTarget();
    map.saveMap.mockRejectedValueOnce(new Error('lote caiu'));
    const { table } = tableTarget();
    const job = createImportJob({ imported: imported(), choice: ALL, map, table });

    await expect(job.run(() => undefined)).rejects.toThrow('lote caiu');
    expect(table.saveFog).not.toHaveBeenCalled();
    await expect(job.run(() => undefined)).resolves.toMatchObject({ mapId: MAP_ID });
    expect(map.saveMap).toHaveBeenCalledTimes(2);
  });

  it('shouldCountTokensThatFellBackToAFigure', async () => {
    const map = mapTarget();
    const { table } = tableTarget();
    vi.mocked(table.createToken).mockResolvedValueOnce('fallback');
    const job = createImportJob({ imported: imported(), choice: ALL, map, table });

    await expect(job.run(() => undefined)).resolves.toMatchObject({ fallbackTokens: 1 });
  });

  it('shouldDiscardTheIncompleteMap', async () => {
    const map = mapTarget();
    const { table } = tableTarget('Ana');
    const job = createImportJob({ imported: imported(), choice: ALL, map, table });

    await expect(job.run(() => undefined)).rejects.toThrow();
    await job.discard();

    expect(map.discard).toHaveBeenCalledTimes(1);
  });
});
