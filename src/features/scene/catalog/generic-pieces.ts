/**
 * Peças genéricas geradas por script, que servem a qualquer estilo: a vegetação (RPG-37, de
 * scripts/assets/vegetation-pieces.mjs em public/assets/nature/) e os enfeites de praça
 * (RPG-35, de scripts/assets/plaza-pieces.mjs em public/assets/plaza/). Árvore, pedra e
 * fonte não mudam de era. As alturas saem do próprio modelo.
 */

import type { Footprint } from '@/domain/map-v2';
import type { CatalogEntry, PieceCategory, PieceIcon } from './catalog-types';

type GenericSpec = {
  key: string;
  label: string;
  keywords: readonly string[];
  icon: PieceIcon;
  height: number;
  footprint?: Footprint;
};

/** Monta as entradas de uma pasta de public/assets, todas da mesma categoria. */
function genericPieces(
  folder: string,
  category: PieceCategory,
  specs: readonly GenericSpec[],
): CatalogEntry[] {
  return specs.map(({ key, footprint, ...spec }) => ({
    key,
    kind: 'prop',
    style: 'generic',
    category,
    visual: { type: 'model', url: `${folder}/${key}.gltf` },
    thumbnail: `${folder}/thumbs/${key}.webp`,
    ...spec,
    ...(footprint ? { footprint } : {}),
  }));
}

const NATURE: readonly GenericSpec[] = [
  {
    key: 'nat-pinheiro',
    label: 'Pinheiro',
    keywords: ['árvore', 'conífera', 'floresta', 'abeto'],
    icon: 'tree',
    height: 2.35,
  },
  {
    key: 'nat-carvalho',
    label: 'Carvalho',
    keywords: ['árvore', 'copa', 'floresta', 'praça'],
    icon: 'treeRound',
    height: 2.04,
  },
  {
    key: 'nat-betula',
    label: 'Bétula',
    keywords: ['árvore', 'tronco branco', 'floresta'],
    icon: 'treeRound',
    height: 2.11,
  },
  {
    key: 'nat-arvore-seca',
    label: 'Árvore seca',
    keywords: ['árvore morta', 'galhos', 'pântano', 'cemitério'],
    icon: 'treeRound',
    height: 1.78,
  },
  {
    key: 'nat-palmeira',
    label: 'Palmeira',
    keywords: ['árvore', 'coqueiro', 'praia', 'oásis', 'deserto'],
    icon: 'palm',
    height: 2.28,
  },
  {
    key: 'nat-cacto',
    label: 'Cacto',
    keywords: ['deserto', 'planta', 'espinho'],
    icon: 'sprout',
    height: 1.62,
  },
  {
    key: 'nat-arbusto',
    label: 'Arbusto redondo',
    keywords: ['moita', 'planta', 'jardim', 'cerca viva'],
    icon: 'sprout',
    height: 0.6,
  },
  {
    key: 'nat-roseira',
    label: 'Roseira',
    keywords: ['flor', 'rosa', 'arbusto', 'jardim'],
    icon: 'flower',
    height: 0.62,
  },
  {
    key: 'nat-flores',
    label: 'Flores',
    keywords: ['canteiro', 'jardim', 'campo', 'margarida'],
    icon: 'flower',
    height: 0.37,
  },
  {
    key: 'nat-capim',
    label: 'Capim',
    keywords: ['grama', 'mato', 'tufo'],
    icon: 'sprout',
    height: 0.33,
  },
  {
    key: 'nat-folhas',
    label: 'Folhas no chão',
    keywords: ['outono', 'folhas secas', 'chão'],
    icon: 'leaf',
    height: 0.03,
  },
  {
    key: 'nat-seixos',
    label: 'Seixos',
    keywords: ['pedrinhas', 'cascalho', 'chão'],
    icon: 'rock',
    height: 0.11,
  },
  {
    key: 'nat-pedregulho',
    label: 'Pedregulho',
    keywords: ['pedra grande', 'rocha', 'musgo', 'penhasco'],
    icon: 'mountain',
    height: 1.11,
    footprint: { width: 2, depth: 2 },
  },
  {
    key: 'nat-cogumelos',
    label: 'Cogumelos',
    keywords: ['fungo', 'caverna', 'floresta'],
    icon: 'sprout',
    height: 0.38,
  },
  {
    key: 'nat-tronco',
    label: 'Tronco caído',
    keywords: ['tora', 'madeira', 'floresta'],
    icon: 'cylinder',
    height: 0.57,
    footprint: { width: 2, depth: 1 },
  },
  {
    key: 'nat-toco',
    label: 'Toco',
    keywords: ['tronco cortado', 'raiz', 'floresta'],
    icon: 'cylinder',
    height: 0.32,
  },
];

const PLAZA: readonly GenericSpec[] = [
  {
    key: 'pra-fonte',
    label: 'Fonte grande',
    keywords: ['chafariz', 'praça', 'água', 'monumento'],
    icon: 'waves',
    height: 1.85,
    footprint: { width: 3, depth: 3 },
  },
  {
    key: 'pra-chafariz',
    label: 'Chafariz',
    keywords: ['fonte', 'praça', 'água'],
    icon: 'waves',
    height: 1.16,
    footprint: { width: 2, depth: 2 },
  },
  {
    key: 'pra-estatua-grande',
    label: 'Estátua do herói',
    keywords: ['monumento', 'praça', 'bronze', 'pedestal'],
    icon: 'statue',
    height: 4,
    footprint: { width: 2, depth: 2 },
  },
  {
    key: 'pra-obelisco',
    label: 'Obelisco',
    keywords: ['monumento', 'praça', 'coluna'],
    icon: 'pillar',
    height: 3,
  },
  {
    key: 'pra-banco-pedra',
    label: 'Banco de pedra',
    keywords: ['banco', 'assento', 'praça', 'jardim'],
    icon: 'armchair',
    height: 0.47,
  },
  {
    key: 'pra-canteiro',
    label: 'Canteiro elevado',
    keywords: ['jardim', 'flores', 'praça', 'floreira'],
    icon: 'flower',
    height: 0.57,
    footprint: { width: 2, depth: 1 },
  },
];

export const GENERIC_PIECES: readonly CatalogEntry[] = [
  ...genericPieces('/assets/nature', 'nature', NATURE),
  ...genericPieces('/assets/plaza', 'structure', PLAZA),
];
