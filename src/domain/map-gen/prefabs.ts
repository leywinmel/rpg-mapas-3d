/**
 * Casas prontas: prédios inteiros, definidos como dado (tamanho, andares, uso, paredes, piso e
 * semente da mobília), montados pela mesma planta do gerador. A semente fixa faz cada casa
 * pronta sair sempre igual.
 */
import { buildBlueprint, type Blueprint, type BuildingUse } from './blueprint';
import { roofFor, STYLE_KITS, type SettlementStyle } from './kits';

export type PrefabDefinition = {
  readonly id: string;
  readonly label: string;
  readonly style: SettlementStyle;
  readonly width: number;
  readonly depth: number;
  readonly stories: number;
  readonly use: BuildingUse;
  /** Qual conjunto de paredes do kit (índice na lista do uso). */
  readonly wallSet: number;
  /** Qual piso interno do kit (índice). */
  readonly floor: number;
  readonly seed: number;
};

type Row = readonly [
  id: string,
  label: string,
  width: number,
  depth: number,
  stories: number,
  use: BuildingUse,
  wallSet: number,
  seed: number,
];

const rows = (style: SettlementStyle, list: readonly Row[]): PrefabDefinition[] =>
  list.map(([id, label, width, depth, stories, use, wallSet, seed]) => ({
    id: `${style}-${id}`,
    label,
    style,
    width,
    depth,
    stories,
    use,
    wallSet,
    floor: seed % STYLE_KITS[style].tiles.indoor.length,
    seed,
  }));

export const PREFABS: readonly PrefabDefinition[] = [
  ...rows('medieval', [
    ['cabana', 'Cabana', 4, 4, 1, 'house', 0, 11],
    ['casa-comprida', 'Casa comprida', 4, 8, 1, 'house', 1, 12],
    ['sobrado', 'Sobrado', 6, 6, 2, 'house', 1, 13],
    ['taverna', 'Taverna', 8, 8, 2, 'shop', 0, 14],
    ['ferraria', 'Ferraria', 6, 4, 1, 'shop', 0, 15],
    ['torre', 'Torre de pedra', 4, 6, 3, 'tower', 0, 16],
  ]),
  ...rows('modern', [
    ['casa', 'Casa', 6, 6, 1, 'house', 0, 21],
    ['sobrado', 'Sobrado', 6, 8, 2, 'house', 1, 22],
    ['loja', 'Loja de esquina', 8, 6, 1, 'shop', 0, 23],
    ['predio', 'Prédio residencial', 10, 10, 4, 'tower', 0, 24],
    ['escritorio', 'Escritório envidraçado', 12, 8, 3, 'tower', 1, 25],
    ['casa-branca', 'Casa branca com telhado', 6, 6, 1, 'house', 1, 26],
    ['casa-amarela', 'Casa amarela', 6, 8, 1, 'house', 2, 27],
    ['sobrado-azul', 'Sobrado azul', 8, 8, 2, 'house', 3, 28],
    ['chale-verde', 'Chalé verde', 4, 6, 1, 'house', 4, 29],
  ]),
  ...rows('futurist', [
    ['modulo', 'Módulo habitacional', 6, 6, 1, 'house', 0, 31],
    ['habitacao', 'Bloco habitacional', 8, 8, 3, 'house', 1, 32],
    ['mercado', 'Mercado de rua', 8, 6, 1, 'shop', 0, 33],
    ['torre', 'Torre corporativa', 10, 10, 6, 'tower', 0, 34],
    ['hangar', 'Hangar', 12, 10, 1, 'shop', 0, 35],
  ]),
  ...rows('cyberpunk', [
    ['cubiculo', 'Cubículo de aluguel', 4, 6, 1, 'house', 0, 41],
    ['cortico', 'Cortiço de neon', 8, 8, 3, 'house', 1, 42],
    ['bar', 'Bar de neon', 8, 6, 1, 'shop', 0, 43],
    ['camelodromo', 'Camelódromo', 10, 8, 1, 'shop', 1, 44],
    ['arranha-ceu', 'Arranha-céu corporativo', 10, 10, 7, 'tower', 0, 45],
  ]),
];

export function findPrefab(id: string): PrefabDefinition | undefined {
  return PREFABS.find((prefab) => prefab.id === id);
}

const blueprints = new Map<string, Blueprint>();

/** A planta da casa pronta (montada uma vez e guardada: é sempre a mesma). */
export function prefabBlueprint(prefab: PrefabDefinition): Blueprint {
  const cached = blueprints.get(prefab.id);
  if (cached) return cached;
  const kit = STYLE_KITS[prefab.style];
  const sets = kit.walls[prefab.use];
  const walls = sets[prefab.wallSet % sets.length]!;
  const blueprint = buildBlueprint(
    {
      width: prefab.width,
      depth: prefab.depth,
      stories: prefab.stories,
      use: prefab.use,
      walls,
      floor: kit.tiles.indoor[prefab.floor % kit.tiles.indoor.length]!,
      roof: roofFor(kit, walls, prefab),
      seed: prefab.seed,
    },
    kit,
  );
  blueprints.set(prefab.id, blueprint);
  return blueprint;
}
