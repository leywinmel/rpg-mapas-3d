/**
 * Catálogo embutido de peças low-poly: as procedurais (geometria simples gerada no
 * navegador, sem baixar nada) e as dos pacotes CC0 (pack-pieces.ts), que só baixam
 * o modelo quando o mapa usa a peça. O editor só usa chave, tipo, nome e ícone.
 */
import { SCENE_PALETTE } from './palette';
import { PACK_PIECES } from './pack-pieces';
import type { CatalogEntry, PieceKind, PieceStyle } from './catalog-types';

const PROCEDURAL = { type: 'procedural' } as const;

/** Luz da tocha: alcance curto para iluminar só a vizinhança, como no mapa de papel. */
const TORCH_LIGHT = {
  color: SCENE_PALETTE.torchLight,
  intensity: 6,
  distance: 5,
  offsetY: 0.95,
} as const;

export const BUILTIN_PIECES: readonly CatalogEntry[] = [
  // Chão
  {
    key: 'piso-pedra',
    kind: 'floor',
    style: 'medieval',
    category: 'floor',
    label: 'Piso de pedra',
    keywords: ['laje', 'masmorra', 'cripta'],
    icon: 'square',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.stoneSide,
    farColor: SCENE_PALETTE.stoneTop,
  },
  {
    key: 'piso-madeira',
    kind: 'floor',
    style: 'medieval',
    category: 'floor',
    label: 'Piso de madeira',
    keywords: ['tábua', 'assoalho', 'taverna'],
    icon: 'square',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.woodSide,
    farColor: SCENE_PALETTE.woodTop,
  },
  {
    key: 'terra',
    kind: 'floor',
    style: 'generic',
    category: 'floor',
    label: 'Terra',
    keywords: ['chão batido', 'caverna', 'estrada'],
    icon: 'mountain',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.dirtSide,
    farColor: SCENE_PALETTE.dirtTop,
  },
  {
    key: 'grama',
    kind: 'floor',
    style: 'generic',
    category: 'floor',
    label: 'Grama',
    keywords: ['campo', 'floresta', 'mato'],
    icon: 'sprout',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.grassSide,
    farColor: SCENE_PALETTE.grassTop,
  },
  {
    key: 'agua',
    kind: 'floor',
    style: 'generic',
    category: 'floor',
    label: 'Água',
    keywords: ['rio', 'lago', 'poça', 'esgoto'],
    icon: 'waves',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.waterSide,
    farColor: SCENE_PALETTE.waterTop,
  },
  {
    key: 'areia',
    kind: 'floor',
    style: 'generic',
    category: 'floor',
    label: 'Areia',
    keywords: ['deserto', 'praia', 'duna'],
    icon: 'mountain',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.sandSide,
    farColor: SCENE_PALETTE.sandTop,
  },
  {
    key: 'chao-rachado',
    kind: 'floor',
    style: 'generic',
    category: 'floor',
    label: 'Chão rachado',
    keywords: ['deserto', 'seca', 'sertão', 'barro'],
    icon: 'mountain',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.crackedSide,
    farColor: SCENE_PALETTE.crackedTop,
  },
  {
    key: 'lama',
    kind: 'floor',
    style: 'generic',
    category: 'floor',
    label: 'Lama',
    keywords: ['pântano', 'brejo', 'barro', 'chuva'],
    icon: 'mountain',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.mudSide,
    farColor: SCENE_PALETTE.mudTop,
  },
  {
    key: 'poca',
    kind: 'floor',
    style: 'generic',
    category: 'floor',
    label: 'Poça na pedra',
    keywords: ['chuva', 'rua', 'molhado', 'água'],
    icon: 'waves',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.stoneSide,
    farColor: SCENE_PALETTE.stoneTop,
  },
  // Paredes
  {
    key: 'parede-pedra',
    kind: 'wall',
    style: 'medieval',
    category: 'wall',
    label: 'Parede de pedra',
    keywords: ['muro', 'tijolo', 'masmorra'],
    icon: 'brick',
    visual: PROCEDURAL,
    farColor: SCENE_PALETTE.wallStone,
  },
  {
    key: 'parede-madeira',
    kind: 'wall',
    style: 'medieval',
    category: 'wall',
    label: 'Parede de madeira',
    keywords: ['tábua', 'cabana', 'paliçada'],
    icon: 'fence',
    visual: PROCEDURAL,
    farColor: SCENE_PALETTE.wallWood,
  },
  {
    key: 'grade',
    kind: 'wall',
    style: 'medieval',
    category: 'wall',
    label: 'Grade de ferro',
    keywords: ['cela', 'prisão', 'portão', 'barras'],
    icon: 'grid',
    visual: PROCEDURAL,
    farColor: SCENE_PALETTE.iron,
  },
  // Objetos
  {
    key: 'barril',
    kind: 'prop',
    style: 'medieval',
    category: 'furniture',
    label: 'Barril',
    keywords: ['tonel', 'vinho'],
    icon: 'cylinder',
    visual: PROCEDURAL,
  },
  {
    key: 'caixa',
    kind: 'prop',
    style: 'generic',
    category: 'furniture',
    label: 'Caixa',
    keywords: ['caixote', 'engradado'],
    icon: 'box',
    visual: PROCEDURAL,
  },
  {
    key: 'mesa',
    kind: 'prop',
    style: 'medieval',
    category: 'furniture',
    label: 'Mesa',
    keywords: ['taverna', 'banquete'],
    icon: 'table',
    visual: PROCEDURAL,
  },
  {
    key: 'cadeira',
    kind: 'prop',
    style: 'medieval',
    category: 'furniture',
    label: 'Cadeira',
    keywords: ['banco', 'assento'],
    icon: 'armchair',
    visual: PROCEDURAL,
  },
  {
    key: 'bau',
    kind: 'prop',
    style: 'medieval',
    category: 'furniture',
    label: 'Baú',
    keywords: ['tesouro', 'arca'],
    icon: 'chest',
    visual: PROCEDURAL,
  },
  {
    key: 'pilar',
    kind: 'prop',
    style: 'medieval',
    category: 'structure',
    label: 'Pilar',
    keywords: ['coluna'],
    icon: 'pillar',
    visual: PROCEDURAL,
  },
  {
    key: 'estatua',
    kind: 'prop',
    style: 'medieval',
    category: 'structure',
    label: 'Estátua',
    keywords: ['ídolo', 'monumento', 'altar'],
    icon: 'statue',
    visual: PROCEDURAL,
  },
  {
    key: 'rocha',
    kind: 'prop',
    style: 'generic',
    category: 'nature',
    label: 'Rocha',
    keywords: ['pedra', 'pedregulho'],
    icon: 'rock',
    visual: PROCEDURAL,
  },
  {
    key: 'arvore',
    kind: 'prop',
    style: 'generic',
    category: 'nature',
    label: 'Árvore',
    keywords: ['pinheiro', 'floresta'],
    icon: 'tree',
    visual: PROCEDURAL,
  },
  {
    key: 'tocha',
    kind: 'prop',
    style: 'medieval',
    category: 'furniture',
    label: 'Tocha',
    keywords: ['fogo', 'luz', 'chama'],
    icon: 'flame',
    visual: PROCEDURAL,
    light: TORCH_LIGHT,
  },
];

/** Tira acento e caixa para a busca achar "baú" digitando "bau". */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Filtro de estilo da biblioteca: um estilo de mundo ou todos. */
export type StyleFilter = Exclude<PieceStyle, 'generic'> | 'all';

/** Peça genérica (terra, árvore...) serve a qualquer estilo, então passa em todo filtro. */
export function matchesStyle(entry: CatalogEntry, style: StyleFilter): boolean {
  return style === 'all' || entry.style === 'generic' || entry.style === style;
}

export type CatalogFilter = { kind?: PieceKind; style?: StyleFilter };

export type PieceCatalog = {
  list: (kind?: PieceKind) => readonly CatalogEntry[];
  get: (key: string) => CatalogEntry | undefined;
  search: (query: string, filter?: CatalogFilter) => readonly CatalogEntry[];
};

/** Monta um catálogo a partir de entradas; recusa chave repetida para o mapa não ficar ambíguo. */
export function createCatalog(entries: readonly CatalogEntry[]): PieceCatalog {
  const byKey = new Map<string, CatalogEntry>();
  for (const entry of entries) {
    if (byKey.has(entry.key)) throw new Error(`Peça repetida no catálogo: ${entry.key}`);
    byKey.set(entry.key, entry);
  }
  const list = (kind?: PieceKind) =>
    kind ? entries.filter((entry) => entry.kind === kind) : entries;
  return {
    list,
    get: (key) => byKey.get(key),
    search: (query, { kind, style = 'all' } = {}) => {
      const needle = normalizeSearchText(query);
      return list(kind).filter(
        (entry) =>
          matchesStyle(entry, style) &&
          (!needle ||
            [entry.label, entry.key, ...entry.keywords].some((text) =>
              normalizeSearchText(text).includes(needle),
            )),
      );
    },
  };
}

export const pieceCatalog = createCatalog([...BUILTIN_PIECES, ...PACK_PIECES]);

/** Chão usado quando o mestre não escolhe outro (mesmo padrão do domínio). */
export const DEFAULT_FLOOR_TILE = 'piso-pedra';
export const DEFAULT_WALL_STYLE = 'parede-pedra';
export const DEFAULT_PROP_KEY = 'barril';
