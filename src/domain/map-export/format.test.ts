import { describe, expect, it } from 'vitest';
import { createFogState, fillFog, isCellCovered, paintFogRect } from '../fog';
import { createEmptyDocument, exportMap } from '../map-document';
import {
  createEmptyMap,
  paintTerrainRect,
  placePiece,
  placeWall,
  serializeMapModel,
  terrainAt,
  type MapModel,
} from '../map-v2';
import { makePiece, makeWall, unwrap } from '../map-v2/test-fixtures';
import { MAX_MAP_FILE_BYTES } from './constants';
import {
  createMapFile,
  mapFileSizeProblem,
  parseMapFile,
  serializeMapFile,
  type FileToken,
} from './format';

const size = { width: 70, depth: 40 };

function editedMap(): MapModel {
  let model = createEmptyMap(size);
  model = unwrap(
    paintTerrainRect(model, { from: { x: 28, z: 2 }, to: { x: 36, z: 6 }, tile: 'piso-madeira' }),
  );
  model = unwrap(placePiece(model, makePiece({ id: 'carro-1', x: 30, z: 20 })));
  return unwrap(placeWall(model, makeWall({ x: 32, z: 5, side: 'west' })));
}

const token: FileToken = {
  name: 'Goblin <b>chefe</b>',
  kind: 'model',
  imagePath: null,
  modelKey: 'creature',
  colorPrimary: '#336699',
  colorSecondary: '#aabbcc',
  x: 4,
  z: 5,
  size: 2,
  level: 0,
  hpCurrent: 3,
  hpMax: 7,
  notes: 'Foge com metade da vida.',
  hidden: true,
};

function errors(text: string): string[] {
  const result = parseMapFile(text);
  return result.ok ? [] : result.errors;
}

describe('arquivo do mapa v2', () => {
  it('ida e volta devolve o mesmo mapa, tokens e névoa', () => {
    const model = editedMap();
    const fog = paintFogRect(
      createFogState(size, true, false),
      { x: 0, z: 0, width: 5, depth: 3 },
      true,
    );
    const text = serializeMapFile({ name: ' Cripta ', model, tokens: [token], fog });
    const result = unwrap(parseMapFile(text));

    expect(result.name).toBe('Cripta');
    expect(result.legacy).toBe(false);
    expect(result.model.size).toEqual(size);
    expect(serializeMapModel(result.model)).toEqual(serializeMapModel(model));
    expect(result.tokens).toEqual([token]);
    expect(result.fog?.enabled).toBe(true);
    expect(isCellCovered(result.fog!, { x: 4, z: 2 })).toBe(true);
    expect(isCellCovered(result.fog!, { x: 5, z: 2 })).toBe(false);
  });

  it('guarda o modelo enviado do token e aceita arquivo antigo sem ele', () => {
    const uploaded: FileToken = {
      ...token,
      kind: 'asset',
      modelKey: null,
      modelAssetId: '7b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d',
    };
    const text = serializeMapFile({
      name: 'Cripta',
      model: editedMap(),
      tokens: [uploaded],
      fog: null,
    });
    expect(unwrap(parseMapFile(text)).tokens).toEqual([uploaded]);
    expect(
      unwrap(
        parseMapFile(
          serializeMapFile({ name: 'A', model: editedMap(), tokens: [token], fog: null }),
        ),
      ).tokens?.[0]?.modelAssetId,
    ).toBeUndefined();
  });

  it('sem tokens nem névoa, o arquivo não leva esses campos', () => {
    const file = createMapFile({ name: 'Vazio', model: createEmptyMap(size) });
    expect(file).not.toHaveProperty('tokens');
    expect(file).not.toHaveProperty('fog');
    expect(file.map.chunks).toEqual([]);
    const result = unwrap(parseMapFile(JSON.stringify(file)));
    expect(result.tokens).toEqual([]);
    expect(result.fog).toBeNull();
  });

  it('guarda a névoa toda coberta como padrão, sem pedaços', () => {
    const fog = fillFog(createFogState(size, true), true);
    const file = createMapFile({ name: 'Breu', model: createEmptyMap(size), fog });
    expect(file.fog).toEqual({ enabled: true, defaultCovered: true, chunks: [] });
  });

  it('o mapa importado mantém o chão pintado', () => {
    const text = serializeMapFile({ name: 'Taverna', model: editedMap() });
    const model = unwrap(parseMapFile(text)).model;
    expect(terrainAt(model, { x: 30, z: 3 })?.tile).toBe('piso-madeira');
    expect(terrainAt(model, { x: 0, z: 0 })?.tile).toBe('piso-pedra');
  });
});

describe('arquivo inválido', () => {
  it('recusa JSON quebrado e arquivo de outro programa', () => {
    expect(errors('{nada')).toEqual(['O arquivo não é um mapa do rpgmaps (JSON inválido).']);
    expect(errors('[]')).toEqual(['O arquivo não é um mapa exportado pelo rpgmaps.']);
    expect(errors('{"format":"outro"}')).toEqual([
      'O arquivo não é um mapa exportado pelo rpgmaps.',
    ]);
  });

  it('recusa versão mais nova', () => {
    const file = { ...createMapFile({ name: 'X', model: createEmptyMap(size) }), version: 3 };
    expect(errors(JSON.stringify(file))[0]).toMatch(/versão mais nova/);
  });

  it('recusa pedaço inválido com a mensagem da leitura do mapa', () => {
    const file = createMapFile({ name: 'X', model: editedMap() });
    const broken = {
      ...file,
      map: { ...file.map, chunks: [{ cx: 0, cz: 0, document: { version: 2 } }] },
    };
    expect(errors(JSON.stringify(broken)).length).toBeGreaterThan(0);
  });

  it('recusa token fora do mapa', () => {
    const file = createMapFile({
      name: 'X',
      model: createEmptyMap(size),
      tokens: [{ ...token, x: 69 }],
    });
    expect(errors(JSON.stringify(file))).toEqual([
      'O token "Goblin <b>chefe</b>" está fora do mapa.',
    ]);
  });

  it('recusa névoa fora do mapa ou repetida', () => {
    const file = createMapFile({ name: 'X', model: createEmptyMap(size) });
    const bits = '1'.repeat(1024);
    const outside = {
      ...file,
      fog: { enabled: true, defaultCovered: false, chunks: [{ cx: 5, cz: 0, covered: bits }] },
    };
    expect(errors(JSON.stringify(outside))[0]).toMatch(/fora do mapa/);
    const twice = {
      ...file,
      fog: {
        enabled: true,
        defaultCovered: false,
        chunks: [
          { cx: 0, cz: 0, covered: bits },
          { cx: 0, cz: 0, covered: bits },
        ],
      },
    };
    expect(errors(JSON.stringify(twice))[0]).toMatch(/repete/);
  });

  it('zera os bits de névoa de fora do pedaço da borda', () => {
    const file = createMapFile({ name: 'X', model: createEmptyMap(size) });
    const withFog = {
      ...file,
      fog: {
        enabled: true,
        defaultCovered: false,
        chunks: [{ cx: 2, cz: 1, covered: '1'.repeat(1024) }],
      },
    };
    const fog = unwrap(parseMapFile(JSON.stringify(withFog))).fog!;
    const bits = fog.chunks.get('2,1')!;
    // Pedaço (2, 1) tem 6×8 casas: o bit da casa local (6, 0) fica fora do mapa.
    expect(bits[0]).toBe(1);
    expect(bits[6]).toBe(0);
    expect(bits.reduce((sum, bit) => sum + bit, 0)).toBe(6 * 8);
  });

  it('recusa arquivo grande demais', () => {
    expect(mapFileSizeProblem(MAX_MAP_FILE_BYTES + 1)).toMatch(/passa de/);
    expect(mapFileSizeProblem(MAX_MAP_FILE_BYTES)).toBeNull();
  });
});

describe('arquivo do v1', () => {
  it('abre convertido para o v2', () => {
    const document = createEmptyDocument({ width: 10, depth: 8 });
    const text = exportMap({ name: 'Antigo', width: 10, depth: 8, document });
    const result = unwrap(parseMapFile(text));
    expect(result.legacy).toBe(true);
    expect(result.name).toBe('Antigo');
    expect(result.model.size).toEqual({ width: 10, depth: 8 });
    expect(terrainAt(result.model, { x: 9, z: 7 })?.tile).toBe('piso-pedra');
  });

  it('repassa o erro do v1', () => {
    const text = JSON.stringify({ format: 'rpgmaps.map', exportedAt: 'x', map: { name: 'A' } });
    expect(errors(text)).toEqual(['O arquivo não é um mapa exportado pelo rpgmaps.']);
  });
});
