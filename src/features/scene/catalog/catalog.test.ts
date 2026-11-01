import { createEmptyDocument, parseMapDocument, type MapDocument } from '@/domain';
import { BUILTIN_PIECES, createCatalog, normalizeSearchText, pieceCatalog } from './catalog';
import type { CatalogEntry } from './catalog-types';
import { getFallbackLayers, getPieceLayers, hasProceduralBuilder } from './piece-geometry';

const REQUIRED_KEYS = {
  floor: ['piso-pedra', 'piso-madeira', 'terra', 'grama', 'agua'],
  wall: ['parede-pedra', 'parede-madeira', 'grade'],
  prop: [
    'barril',
    'caixa',
    'mesa',
    'cadeira',
    'bau',
    'pilar',
    'estatua',
    'rocha',
    'arvore',
    'tocha',
  ],
} as const;

describe('pieceCatalog', () => {
  it('shouldContainEveryRequiredPieceWithItsKind', () => {
    for (const [kind, keys] of Object.entries(REQUIRED_KEYS)) {
      for (const key of keys) expect(pieceCatalog.get(key)?.kind).toBe(kind);
    }
  });

  it('shouldUseKeysTheMapDocumentAccepts', () => {
    const size = { width: 4, depth: 4 };
    const base = createEmptyDocument(size);
    const document: MapDocument = {
      ...base,
      floors: pieceCatalog.list('floor').map((entry, index) => ({
        x: index % 4,
        z: Math.floor(index / 4),
        tile: entry.key,
        height: 0,
      })),
      walls: pieceCatalog
        .list('wall')
        .map((entry, index) => ({ x: index, z: 0, side: 'north', style: entry.key, height: 1 })),
      props: pieceCatalog.list('prop').map((entry, index) => ({
        id: entry.key,
        asset: { source: 'catalog', key: entry.key },
        x: (index % 4) + 0.5,
        z: 0.5,
        elevation: 0,
        rotation: 0,
        scale: 1,
      })),
    };
    expect(parseMapDocument(document, size)).toMatchObject({ ok: true });
  });

  it('shouldHaveAProceduralBuilderForEveryProceduralEntry', () => {
    for (const entry of BUILTIN_PIECES) {
      if (entry.visual.type === 'procedural') expect(hasProceduralBuilder(entry.key)).toBe(true);
    }
  });

  it('shouldGiveFloorsASideColor', () => {
    for (const entry of pieceCatalog.list('floor')) expect(entry.sideColor).toMatch(/^#/);
  });

  it('shouldGiveTheTorchALight', () => {
    expect(pieceCatalog.get('tocha')?.light?.distance).toBeGreaterThan(0);
  });
});

describe('search', () => {
  it('shouldIgnoreAccentsAndCase', () => {
    expect(normalizeSearchText('  Baú ')).toBe('bau');
    expect(pieceCatalog.search('BAÚ').map((entry) => entry.key)).toEqual(['bau']);
  });

  it('shouldMatchKeywordsAndFilterByKind', () => {
    expect(pieceCatalog.search('masmorra', 'wall').map((entry) => entry.key)).toEqual([
      'parede-pedra',
    ]);
    expect(pieceCatalog.search('', 'floor')).toHaveLength(REQUIRED_KEYS.floor.length);
  });
});

describe('createCatalog', () => {
  const modelEntry: CatalogEntry = {
    key: 'altar-cc0',
    kind: 'prop',
    label: 'Altar (pacote CC0)',
    keywords: [],
    icon: 'statue',
    visual: { type: 'model', url: '/assets/altar.glb' },
  };

  it('shouldAcceptGlbEntriesFromPublicAssets', () => {
    const catalog = createCatalog([...BUILTIN_PIECES, modelEntry]);
    expect(catalog.get('altar-cc0')?.visual).toEqual({ type: 'model', url: '/assets/altar.glb' });
    expect(catalog.list('prop')).toContain(modelEntry);
  });

  it('shouldRejectDuplicatedKeys', () => {
    expect(() => createCatalog([modelEntry, modelEntry])).toThrow(/repetida/);
  });
});

describe('piece geometry', () => {
  it('shouldBuildVertexColoredGeometryForEveryProceduralPiece', () => {
    for (const entry of BUILTIN_PIECES) {
      const layers = getPieceLayers(entry.key);
      expect(layers).not.toBe(getFallbackLayers());
      for (const layer of layers) {
        expect(layer.geometry.getAttribute('position').count).toBeGreaterThan(0);
        expect(layer.geometry.getAttribute('color')).toBeDefined();
      }
    }
  });

  it('shouldReuseTheSameGeometryForTheSamePiece', () => {
    expect(getPieceLayers('barril')).toBe(getPieceLayers('barril'));
  });

  it('shouldFallBackToTheMarkedBoxForUnknownPieces', () => {
    expect(getPieceLayers('peca-que-nao-existe')).toBe(getFallbackLayers());
  });

  it('shouldKeepPropsInsideOneCell', () => {
    for (const entry of pieceCatalog.list('prop')) {
      for (const layer of getPieceLayers(entry.key)) {
        const box = layer.geometry.boundingBox!;
        expect(box.min.y).toBeGreaterThanOrEqual(-0.001);
        expect(box.max.x - box.min.x).toBeLessThanOrEqual(1);
        expect(box.max.z - box.min.z).toBeLessThanOrEqual(1);
      }
    }
  });
});
