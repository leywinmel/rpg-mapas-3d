import { describe, expect, it } from 'vitest';
import {
  kitKeys,
  prefabBlueprint,
  PREFABS,
  READY_MAPS,
  SETTLEMENT_STYLES,
  STYLE_KITS,
} from '@/domain/map-gen';
import { pieceCatalog } from './catalog';

const SINGLE = { width: 1, depth: 1 };

// O gerador mora no domínio e só conhece chaves; aqui confirmamos que cada chave existe
// no catálogo de verdade, com o tipo e o tamanho que o gerador supõe.
describe.each(SETTLEMENT_STYLES)('kit de peças do gerador (%s)', (style) => {
  const keys = kitKeys(STYLE_KITS[style]);

  it('shouldUseFloorsThatExistInTheCatalog', () => {
    for (const key of keys.floors) expect(pieceCatalog.get(key)?.kind, key).toBe('floor');
  });

  it('shouldUseWallsThatExistInTheCatalog', () => {
    for (const key of keys.walls) expect(pieceCatalog.get(key)?.kind, key).toBe('wall');
  });

  it('shouldUsePropsWithTheFootprintTheGeneratorExpects', () => {
    for (const { key, footprint } of keys.props) {
      const entry = pieceCatalog.get(key);
      expect(entry?.kind, key).toBe('prop');
      expect(entry?.footprint ?? SINGLE, key).toEqual(footprint);
    }
  });
});

describe('casas prontas', () => {
  it('shouldBuildEveryPrefabWithCatalogPieces', () => {
    for (const prefab of PREFABS) {
      const blueprint = prefabBlueprint(prefab);
      expect(pieceCatalog.get(blueprint.floor)?.kind, prefab.id).toBe('floor');
      for (const wall of blueprint.walls) expect(pieceCatalog.get(wall.style)?.kind).toBe('wall');
      for (const piece of blueprint.pieces)
        expect(pieceCatalog.get(piece.key), piece.key).toBeDefined();
    }
  });
});

describe.each(READY_MAPS)('mapa pronto $id', (ready) => {
  const { model } = ready.build();
  const chunks = [...model.chunks.values()];

  it('shouldUseWallsThatExistInTheCatalog', () => {
    for (const wall of chunks.flatMap((chunk) => chunk.walls))
      expect(pieceCatalog.get(wall.style)?.kind, wall.style).toBe('wall');
  });

  it('shouldUseFloorsThatExistInTheCatalog', () => {
    for (const key of chunks.flatMap((chunk) => chunk.terrain.palette))
      expect(pieceCatalog.get(key)?.kind, key).toBe('floor');
  });

  it('shouldUsePiecesWithTheFootprintOfTheCatalog', () => {
    for (const piece of chunks.flatMap((chunk) => chunk.pieces)) {
      if (piece.asset.source !== 'catalog') continue;
      const entry = pieceCatalog.get(piece.asset.key);
      expect(entry, piece.asset.key).toBeDefined();
      if (entry?.kind === 'floor') continue;
      expect(entry?.footprint ?? SINGLE, piece.asset.key).toEqual(piece.footprint);
    }
  });
});
