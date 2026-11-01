/**
 * Catálogo embutido de peças low-poly. As peças atuais são procedurais (geometria
 * simples gerada no navegador, sem baixar nada). Uma peça vinda de um pacote CC0
 * entra como `visual: { type: 'model', url: '/assets/...' }`: o editor só usa
 * chave, tipo, nome e ícone, então não muda.
 */
import { SCENE_PALETTE } from './palette';
import type { CatalogEntry, PieceKind } from './catalog-types';

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
    label: 'Piso de pedra',
    keywords: ['laje', 'masmorra', 'cripta'],
    icon: 'square',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.stoneSide,
  },
  {
    key: 'piso-madeira',
    kind: 'floor',
    label: 'Piso de madeira',
    keywords: ['tábua', 'assoalho', 'taverna'],
    icon: 'square',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.woodSide,
  },
  {
    key: 'terra',
    kind: 'floor',
    label: 'Terra',
    keywords: ['chão batido', 'caverna', 'estrada'],
    icon: 'mountain',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.dirtSide,
  },
  {
    key: 'grama',
    kind: 'floor',
    label: 'Grama',
    keywords: ['campo', 'floresta', 'mato'],
    icon: 'sprout',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.grassSide,
  },
  {
    key: 'agua',
    kind: 'floor',
    label: 'Água',
    keywords: ['rio', 'lago', 'poça', 'esgoto'],
    icon: 'waves',
    visual: PROCEDURAL,
    sideColor: SCENE_PALETTE.waterSide,
  },
  // Paredes
  {
    key: 'parede-pedra',
    kind: 'wall',
    label: 'Parede de pedra',
    keywords: ['muro', 'tijolo', 'masmorra'],
    icon: 'brick',
    visual: PROCEDURAL,
  },
  {
    key: 'parede-madeira',
    kind: 'wall',
    label: 'Parede de madeira',
    keywords: ['tábua', 'cabana', 'paliçada'],
    icon: 'fence',
    visual: PROCEDURAL,
  },
  {
    key: 'grade',
    kind: 'wall',
    label: 'Grade de ferro',
    keywords: ['cela', 'prisão', 'portão', 'barras'],
    icon: 'grid',
    visual: PROCEDURAL,
  },
  // Objetos
  {
    key: 'barril',
    kind: 'prop',
    label: 'Barril',
    keywords: ['tonel', 'vinho'],
    icon: 'cylinder',
    visual: PROCEDURAL,
  },
  {
    key: 'caixa',
    kind: 'prop',
    label: 'Caixa',
    keywords: ['caixote', 'engradado'],
    icon: 'box',
    visual: PROCEDURAL,
  },
  {
    key: 'mesa',
    kind: 'prop',
    label: 'Mesa',
    keywords: ['taverna', 'banquete'],
    icon: 'table',
    visual: PROCEDURAL,
  },
  {
    key: 'cadeira',
    kind: 'prop',
    label: 'Cadeira',
    keywords: ['banco', 'assento'],
    icon: 'armchair',
    visual: PROCEDURAL,
  },
  {
    key: 'bau',
    kind: 'prop',
    label: 'Baú',
    keywords: ['tesouro', 'arca'],
    icon: 'chest',
    visual: PROCEDURAL,
  },
  {
    key: 'pilar',
    kind: 'prop',
    label: 'Pilar',
    keywords: ['coluna'],
    icon: 'pillar',
    visual: PROCEDURAL,
  },
  {
    key: 'estatua',
    kind: 'prop',
    label: 'Estátua',
    keywords: ['ídolo', 'monumento', 'altar'],
    icon: 'statue',
    visual: PROCEDURAL,
  },
  {
    key: 'rocha',
    kind: 'prop',
    label: 'Rocha',
    keywords: ['pedra', 'pedregulho'],
    icon: 'rock',
    visual: PROCEDURAL,
  },
  {
    key: 'arvore',
    kind: 'prop',
    label: 'Árvore',
    keywords: ['pinheiro', 'floresta'],
    icon: 'tree',
    visual: PROCEDURAL,
  },
  {
    key: 'tocha',
    kind: 'prop',
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

export type PieceCatalog = {
  list: (kind?: PieceKind) => readonly CatalogEntry[];
  get: (key: string) => CatalogEntry | undefined;
  search: (query: string, kind?: PieceKind) => readonly CatalogEntry[];
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
    search: (query, kind) => {
      const needle = normalizeSearchText(query);
      if (!needle) return list(kind);
      return list(kind).filter((entry) =>
        [entry.label, entry.key, ...entry.keywords].some((text) =>
          normalizeSearchText(text).includes(needle),
        ),
      );
    },
  };
}

export const pieceCatalog = createCatalog(BUILTIN_PIECES);

/** Chão usado quando o mestre não escolhe outro (mesmo padrão do domínio). */
export const DEFAULT_FLOOR_TILE = 'piso-pedra';
export const DEFAULT_WALL_STYLE = 'parede-pedra';
export const DEFAULT_PROP_KEY = 'barril';
