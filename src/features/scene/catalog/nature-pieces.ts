/**
 * Vegetação genérica (RPG-37), gerada por scripts/assets/vegetation-pieces.mjs em
 * public/assets/nature/. Serve a qualquer estilo: árvore e pedra não mudam de era.
 * As alturas saem do próprio modelo (topo da copa, das folhas ou da pedra).
 */

import type { Footprint } from '@/domain/map-v2';
import type { CatalogEntry, PieceIcon } from './catalog-types';

const FOLDER = '/assets/nature';

type NatureSpec = {
  key: string;
  label: string;
  keywords: readonly string[];
  icon: PieceIcon;
  height: number;
  footprint?: Footprint;
};

function naturePiece({ key, footprint, ...spec }: NatureSpec): CatalogEntry {
  return {
    key,
    kind: 'prop',
    style: 'generic',
    category: 'nature',
    visual: { type: 'model', url: `${FOLDER}/${key}.gltf` },
    thumbnail: `${FOLDER}/thumbs/${key}.webp`,
    ...spec,
    ...(footprint ? { footprint } : {}),
  };
}

const SPECS: readonly NatureSpec[] = [
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

export const NATURE_PIECES: readonly CatalogEntry[] = SPECS.map(naturePiece);
