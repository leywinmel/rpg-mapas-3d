/**
 * Casas prontas: prédios inteiros, definidos como dado (tamanho, andares, uso, paredes, piso e
 * semente da mobília), montados pela mesma planta do gerador. A semente fixa faz cada casa
 * pronta sair sempre igual.
 */
import { buildBlueprint, type Blueprint, type BuildingUse } from './blueprint';
import { STYLE_KITS, type SettlementStyle } from './kits';

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
  ]),
  ...rows('futurist', [
    ['modulo', 'Módulo habitacional', 6, 6, 1, 'house', 0, 31],
    ['habitacao', 'Bloco habitacional', 8, 8, 3, 'house', 1, 32],
    ['mercado', 'Mercado de rua', 8, 6, 1, 'shop', 0, 33],
    ['torre', 'Torre corporativa', 10, 10, 6, 'tower', 0, 34],
    ['hangar', 'Hangar', 12, 10, 1, 'shop', 0, 35],
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
  const blueprint = buildBlueprint(
    {
      width: prefab.width,
      depth: prefab.depth,
      stories: prefab.stories,
      use: prefab.use,
      walls: sets[prefab.wallSet % sets.length]!,
      floor: kit.tiles.indoor[prefab.floor % kit.tiles.indoor.length]!,
      roof: kit.roof,
      seed: prefab.seed,
    },
    kit,
  );
  blueprints.set(prefab.id, blueprint);
  return blueprint;
}
