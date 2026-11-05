import { pieceCatalog } from './catalog';
import { isMovableAsset } from './movable';

const catalog = (key: string) => ({ source: 'catalog' as const, key });

describe('isMovableAsset', () => {
  it('shouldMoveEveryVehicle', () => {
    const vehicles = pieceCatalog.list('prop').filter((entry) => entry.category === 'vehicle');
    expect(vehicles.length).toBeGreaterThan(0);
    for (const entry of vehicles) expect(isMovableAsset(catalog(entry.key))).toBe(true);
    expect(isMovableAsset(catalog('med-carroca'))).toBe(true);
    expect(isMovableAsset(catalog('mod-caminhonete'))).toBe(true);
  });

  it('shouldMoveLooseObjects', () => {
    for (const key of ['barril', 'caixa', 'mesa', 'bau', 'med-caixote', 'fut-tambor']) {
      expect(isMovableAsset(catalog(key))).toBe(true);
    }
  });

  it('shouldKeepFloorsWallsRoofsAndStructuresInPlace', () => {
    for (const key of ['piso-pedra', 'parede-pedra', 'pilar', 'estatua', 'arvore', 'rocha']) {
      expect(isMovableAsset(catalog(key))).toBe(false);
    }
    const fixed = pieceCatalog
      .list()
      .filter((entry) => ['floor', 'wall', 'roof', 'opening', 'stairs'].includes(entry.category));
    expect(fixed.length).toBeGreaterThan(0);
    for (const entry of fixed) expect(isMovableAsset(catalog(entry.key))).toBe(false);
  });

  it('shouldMoveTheGameMastersOwnModelsButNotUnknownKeys', () => {
    expect(
      isMovableAsset({ source: 'upload', assetId: '00000000-0000-4000-8000-000000000001' }),
    ).toBe(true);
    expect(isMovableAsset(catalog('nao-existe'))).toBe(false);
  });
});
