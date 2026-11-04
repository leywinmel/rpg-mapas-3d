import { describe, expect, it, vi } from 'vitest';
import { createFogState } from '@/domain';
import type { FileToken } from '@/domain/map-export';
import { createTableImportTarget, type TableTargetDeps } from './table-target';

const IMAGE_PATH = 'a/b.png';

function fileToken(patch: Partial<FileToken> = {}): FileToken {
  return {
    name: 'Goblin',
    kind: 'image',
    imagePath: IMAGE_PATH,
    modelKey: null,
    colorPrimary: null,
    colorSecondary: null,
    x: 3,
    z: 4,
    size: 1,
    level: 0,
    hpCurrent: 7,
    hpMax: 7,
    notes: '',
    hidden: true,
    ...patch,
  };
}

function deps(fetchFile: TableTargetDeps['fetchFile'] = async () => new Blob(['png'])) {
  return {
    fog: { saveFog: vi.fn(async () => undefined) },
    tokens: {
      createToken: vi.fn(async () => ({ id: 'token-novo' })),
      updateToken: vi.fn(async () => undefined),
      getImageUrl: vi.fn(async () => 'https://imagem'),
    },
    fetchFile,
  };
}

const target = (fake: ReturnType<typeof deps>) =>
  createTableImportTarget(fake as unknown as TableTargetDeps);

describe('createTableImportTarget', () => {
  it('shouldCopyTheImageIntoANewTokenWithoutOwner', async () => {
    const fake = deps();
    const onCreated = vi.fn();

    const result = await target(fake).createToken({
      mapId: 'mapa',
      token: fileToken(),
      onCreated,
      previousId: null,
    });

    expect(result).toBe('created');
    expect(fake.tokens.getImageUrl).toHaveBeenCalledWith(IMAGE_PATH);
    expect(fake.tokens.createToken).toHaveBeenCalledWith(
      expect.objectContaining({
        mapId: 'mapa',
        ownerId: null,
        hidden: true,
        look: expect.objectContaining({ kind: 'image', image: expect.any(File) }),
      }),
    );
    expect(onCreated).toHaveBeenCalledWith('token-novo');
    expect(fake.tokens.updateToken).not.toHaveBeenCalled();
  });

  it('shouldFallBackToAFigureWhenTheImageIsGone', async () => {
    const fake = deps(async () => {
      throw new Error('404');
    });

    const result = await target(fake).createToken({
      mapId: 'mapa',
      token: fileToken(),
      onCreated: () => undefined,
      previousId: null,
    });

    expect(result).toBe('fallback');
    expect(fake.tokens.createToken).toHaveBeenCalledWith(
      expect.objectContaining({ look: expect.objectContaining({ kind: 'model' }) }),
    );
  });

  it('shouldSaveLifeAndNotesInASecondStep', async () => {
    const fake = deps();

    await target(fake).createToken({
      mapId: 'mapa',
      token: fileToken({ kind: 'model', imagePath: null, hpCurrent: 2, notes: 'ferido' }),
      onCreated: () => undefined,
      previousId: null,
    });

    expect(fake.tokens.updateToken).toHaveBeenCalledWith('token-novo', {
      hpCurrent: 2,
      notes: 'ferido',
    });
  });

  it('shouldOnlyFinishTheTokenCreatedInAPreviousTry', async () => {
    const fake = deps();

    await target(fake).createToken({
      mapId: 'mapa',
      token: fileToken({ hpCurrent: 1 }),
      onCreated: () => undefined,
      previousId: 'token-antigo',
    });

    expect(fake.tokens.createToken).not.toHaveBeenCalled();
    expect(fake.tokens.updateToken).toHaveBeenCalledWith('token-antigo', { hpCurrent: 1 });
  });

  it('shouldSaveTheWholeFog', async () => {
    const fake = deps();
    const fog = createFogState({ width: 40, depth: 40 });

    await target(fake).saveFog('mapa', fog);

    expect(fake.fog.saveFog).toHaveBeenCalledWith('mapa', expect.anything());
  });
});
