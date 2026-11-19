/**
 * Peças do templo-escola japonês (RPG-64), geradas por scripts/assets/japanese-pieces.mjs em
 * public/assets/japanese/: paredes de madeira e reboco, telhados de beiral curvo, torii,
 * lanterna, cerejeira, bambuzal, pagode, campanário, incensário e boneco de treino. As alturas
 * saem do próprio modelo.
 */

import { HEIGHT_STEP, STORY_HEIGHT_STEPS, type Footprint } from '@/domain/map-v2';
import type { CatalogEntry, PieceCategory, PieceIcon } from './catalog-types';

const FOLDER = '/assets/japanese';
const STORY_SPAN = STORY_HEIGHT_STEPS * HEIGHT_STEP;
/** Cor de longe das paredes: o reboco claro riscado de madeira escura. */
const WALL_FAR_COLOR = '#b4aa98';

type JapaneseSpec = {
  key: string;
  label: string;
  keywords: readonly string[];
  icon: PieceIcon;
  height: number;
  category: PieceCategory;
  footprint?: Footprint;
};

const model = (key: string) =>
  ({
    visual: { type: 'model', url: `${FOLDER}/${key}.gltf` },
    thumbnail: `${FOLDER}/thumbs/${key}.webp`,
  }) as const;

const wall = (key: string, label: string, icon: PieceIcon, category: PieceCategory) =>
  ({
    key,
    kind: 'wall',
    style: 'generic',
    category,
    label,
    keywords: ['japonês', 'templo', 'madeira', 'casa'],
    icon,
    ...model(key),
    height: 2,
    wallSpan: STORY_SPAN,
    farColor: WALL_FAR_COLOR,
  }) satisfies CatalogEntry;

const PROPS: readonly JapaneseSpec[] = [
  {
    key: 'jap-telhado-2x2',
    label: 'Telhado japonês 2×2',
    keywords: ['telha', 'templo', 'beiral', 'japonês'],
    icon: 'roof',
    height: 1.35,
    category: 'roof',
    footprint: { width: 2, depth: 2 },
  },
  {
    key: 'jap-telhado-2x4',
    label: 'Telhado japonês 2×4',
    keywords: ['telha', 'templo', 'beiral', 'japonês'],
    icon: 'roof',
    height: 1.35,
    category: 'roof',
    footprint: { width: 2, depth: 4 },
  },
  {
    key: 'jap-telhado-4x4',
    label: 'Telhado japonês 4×4',
    keywords: ['telha', 'templo', 'beiral', 'japonês'],
    icon: 'roof',
    height: 2.3,
    category: 'roof',
    footprint: { width: 4, depth: 4 },
  },
  {
    key: 'jap-torii',
    label: 'Portal torii',
    keywords: ['portal', 'templo', 'santuário', 'entrada', 'japonês'],
    icon: 'pillar',
    height: 2.56,
    category: 'structure',
    footprint: { width: 3, depth: 1 },
  },
  {
    key: 'jap-pagode',
    label: 'Pagode',
    keywords: ['torre', 'templo', 'cinco andares', 'japonês'],
    icon: 'pillar',
    height: 6.27,
    category: 'structure',
    footprint: { width: 3, depth: 3 },
  },
  {
    key: 'jap-campanario',
    label: 'Campanário',
    keywords: ['sino', 'templo', 'bronze', 'japonês'],
    icon: 'pillar',
    height: 2.85,
    category: 'structure',
    footprint: { width: 2, depth: 2 },
  },
  {
    key: 'jap-lanterna',
    label: 'Lanterna de pedra',
    keywords: ['luz', 'templo', 'jardim', 'caminho', 'japonês'],
    icon: 'flame',
    height: 1.24,
    category: 'structure',
  },
  {
    key: 'jap-incensario',
    label: 'Incensário',
    keywords: ['incenso', 'templo', 'bronze', 'pátio', 'japonês'],
    icon: 'cylinder',
    height: 0.88,
    category: 'furniture',
  },
  {
    key: 'jap-boneco-treino',
    label: 'Boneco de treino',
    keywords: ['treino', 'luta', 'alvo', 'palha', 'escola'],
    icon: 'statue',
    height: 1.73,
    category: 'furniture',
  },
  {
    key: 'jap-sakura',
    label: 'Cerejeira',
    keywords: ['árvore', 'flor', 'rosa', 'jardim', 'japonês'],
    icon: 'treeRound',
    height: 2.11,
    category: 'nature',
  },
  {
    key: 'jap-bambu',
    label: 'Bambuzal',
    keywords: ['bambu', 'mata', 'jardim', 'japonês'],
    icon: 'leaf',
    height: 3.15,
    category: 'nature',
  },
];

export const JAPANESE_PIECES: readonly CatalogEntry[] = [
  wall('jap-parede', 'Parede japonesa', 'brick', 'wall'),
  wall('jap-parede-janela', 'Parede japonesa com janela', 'window', 'opening'),
  wall('jap-parede-porta', 'Parede japonesa com porta', 'door', 'opening'),
  ...PROPS.map(({ key, footprint, ...spec }) => ({
    key,
    kind: 'prop' as const,
    style: 'generic' as const,
    ...model(key),
    ...spec,
    ...(footprint ? { footprint } : {}),
  })),
];
