import {
  createEmptyDocument,
  exportMap,
  importMap,
  MAP_DOCUMENT_VERSION,
  parseMapDocument,
  type MapDocument,
} from './map-document';

const size = { width: 4, depth: 3 };

function sampleDocument(): MapDocument {
  const doc = createEmptyDocument(size);
  return {
    ...doc,
    walls: [
      { x: 0, z: 0, side: 'north', style: 'parede-pedra', height: 2 },
      { x: 4, z: 2, side: 'west', style: 'parede-pedra', height: 2 },
    ],
    props: [
      {
        id: 'barril-1',
        asset: { source: 'catalog', key: 'barril' },
        x: 1.5,
        z: 1.5,
        elevation: 0,
        rotation: 90,
        scale: 1,
      },
    ],
  };
}

describe('map document', () => {
  it('shouldCreateAFullFloorForNewMaps', () => {
    const doc = createEmptyDocument(size);
    expect(doc.version).toBe(MAP_DOCUMENT_VERSION);
    expect(doc.floors).toHaveLength(12);
  });

  it('shouldAcceptAValidDocument', () => {
    const result = parseMapDocument(sampleDocument(), size);
    expect(result.ok).toBe(true);
  });

  it('shouldFillDefaultsForOptionalPropFields', () => {
    const doc = sampleDocument();
    const raw = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    raw.props = [{ id: 'p', asset: { source: 'catalog', key: 'tocha' }, x: 1, z: 1 }];
    const result = parseMapDocument(raw, size);
    expect(result.ok && result.value.props[0]).toMatchObject({
      rotation: 0,
      scale: 1,
      elevation: 0,
    });
  });

  it('shouldRejectPiecesOutsideTheMap', () => {
    const doc = sampleDocument();
    doc.floors.push({ x: 4, z: 0, tile: 'piso-pedra', height: 0 });
    doc.walls.push({ x: 4, z: 0, side: 'north', style: 'parede-pedra', height: 1 });
    const result = parseMapDocument(doc, size);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
  });

  it('shouldRejectDuplicatedFloorsAndProps', () => {
    const doc = sampleDocument();
    doc.floors.push({ x: 0, z: 0, tile: 'piso-madeira', height: 1 });
    doc.props.push({ ...doc.props[0]! });
    const result = parseMapDocument(doc, size);
    expect(result.ok).toBe(false);
  });

  it('shouldRejectMapsFromANewerVersion', () => {
    const result = parseMapDocument({ ...sampleDocument(), version: 99 }, size);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/mais nova/);
  });

  it('shouldRejectUnsafeCatalogKeys', () => {
    const doc = sampleDocument();
    const raw = { ...doc, floors: [{ x: 0, z: 0, tile: '../../etc', height: 0 }] };
    expect(parseMapDocument(raw, size).ok).toBe(false);
  });

  it('shouldRoundTripThroughTheExportFile', () => {
    const map = { name: 'Taverna do Corvo', width: 4, depth: 3, document: sampleDocument() };
    const text = exportMap(map, new Date('2026-10-31T12:00:00Z'));
    const result = importMap(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(map);
  });

  it('shouldExplainWhyAnImportFailed', () => {
    expect(importMap('não é json')).toMatchObject({ ok: false });
    expect(importMap(JSON.stringify({ format: 'outro' }))).toMatchObject({ ok: false });
    const tooBig = 'x'.repeat(2_000_001);
    const result = importMap(tooBig);
    expect(!result.ok && result.errors[0]).toMatch(/2 MB/);
  });
});
