/**
 * Móveis e adereços de escola e hospital (RPG-65) e do posto de gasolina (RPG-45), gerados por
 * scripts/assets/institution-pieces.mjs em public/assets/institution/. Servem às salas de aula
 * e enfermarias do gerador, às casas prontas e aos mapas prontos de escola, hospital e posto. As
 * alturas saem do próprio modelo.
 */

import type { Footprint } from '@/domain/map-v2';
import type { CatalogEntry, PieceCategory, PieceIcon } from './catalog-types';

const FOLDER = '/assets/institution';

type InstitutionSpec = {
  key: string;
  label: string;
  keywords: readonly string[];
  icon: PieceIcon;
  height: number;
  category: PieceCategory;
  footprint?: Footprint;
};

const SCHOOL = ['escola', 'aula', 'colégio'] as const;
const HOSPITAL = ['hospital', 'saúde', 'médico', 'enfermaria'] as const;
const GAS = ['posto', 'gasolina', 'combustível'] as const;

const SPECS: readonly InstitutionSpec[] = [
  {
    key: 'esc-carteira',
    label: 'Carteira escolar',
    keywords: [...SCHOOL, 'mesa', 'cadeira', 'aluno'],
    icon: 'table',
    height: 0.6,
    category: 'furniture',
  },
  {
    key: 'esc-mesa-professor',
    label: 'Mesa do professor',
    keywords: [...SCHOOL, 'mesa', 'escrivaninha'],
    icon: 'table',
    height: 0.78,
    category: 'furniture',
    footprint: { width: 2, depth: 1 },
  },
  {
    key: 'esc-lousa',
    label: 'Lousa',
    keywords: [...SCHOOL, 'quadro', 'quadro-negro', 'giz'],
    icon: 'monitor',
    height: 1.5,
    category: 'furniture',
    footprint: { width: 2, depth: 1 },
  },
  {
    key: 'esc-armario',
    label: 'Armário de aço',
    keywords: [...SCHOOL, 'armário', 'escaninho', 'vestiário'],
    icon: 'box',
    height: 1.6,
    category: 'furniture',
  },
  {
    key: 'esc-cesta-basquete',
    label: 'Tabela de basquete',
    keywords: [...SCHOOL, 'basquete', 'quadra', 'esporte', 'aro'],
    icon: 'pillar',
    height: 2.6,
    category: 'structure',
  },
  {
    key: 'esc-trave',
    label: 'Trave de futebol',
    keywords: [...SCHOOL, 'gol', 'futebol', 'campo', 'esporte'],
    icon: 'fence',
    height: 1.28,
    category: 'structure',
    footprint: { width: 3, depth: 1 },
  },
  {
    key: 'esc-bebedouro',
    label: 'Bebedouro',
    keywords: [...SCHOOL, 'água', 'corredor'],
    icon: 'cylinder',
    height: 0.94,
    category: 'furniture',
  },
  {
    key: 'esc-mastro',
    label: 'Mastro com bandeira',
    keywords: [...SCHOOL, 'bandeira', 'pátio'],
    icon: 'pillar',
    height: 3.26,
    category: 'structure',
  },
  {
    key: 'hos-leito',
    label: 'Leito de hospital',
    keywords: [...HOSPITAL, 'cama', 'paciente'],
    icon: 'armchair',
    height: 1,
    category: 'furniture',
    footprint: { width: 1, depth: 2 },
  },
  {
    key: 'hos-soro',
    label: 'Suporte de soro',
    keywords: [...HOSPITAL, 'soro', 'bolsa'],
    icon: 'pillar',
    height: 1.7,
    category: 'furniture',
  },
  {
    key: 'hos-monitor',
    label: 'Monitor de sinais',
    keywords: [...HOSPITAL, 'monitor', 'coração', 'aparelho'],
    icon: 'monitor',
    height: 1.28,
    category: 'furniture',
  },
  {
    key: 'hos-biombo',
    label: 'Biombo',
    keywords: [...HOSPITAL, 'cortina', 'divisória'],
    icon: 'fence',
    height: 1.4,
    category: 'furniture',
  },
  {
    key: 'hos-cadeira-rodas',
    label: 'Cadeira de rodas',
    keywords: [...HOSPITAL, 'cadeira', 'rodas'],
    icon: 'armchair',
    height: 0.84,
    category: 'furniture',
  },
  {
    key: 'hos-maca',
    label: 'Maca',
    keywords: [...HOSPITAL, 'maca', 'pronto-socorro', 'emergência'],
    icon: 'armchair',
    height: 0.82,
    category: 'furniture',
    footprint: { width: 1, depth: 2 },
  },
  {
    key: 'hos-armario',
    label: 'Armário de remédios',
    keywords: [...HOSPITAL, 'remédio', 'farmácia', 'armário'],
    icon: 'box',
    height: 1.6,
    category: 'furniture',
  },
  {
    key: 'hos-balcao',
    label: 'Balcão da recepção',
    keywords: [...HOSPITAL, 'recepção', 'balcão', 'atendimento'],
    icon: 'table',
    height: 1.04,
    category: 'furniture',
    footprint: { width: 2, depth: 1 },
  },
  {
    key: 'hos-heliponto',
    label: 'Heliponto',
    keywords: [...HOSPITAL, 'helicóptero', 'pouso', 'H'],
    icon: 'square',
    height: 0.1,
    category: 'structure',
    footprint: { width: 4, depth: 4 },
  },
  {
    key: 'pos-bomba',
    label: 'Bomba de combustível',
    keywords: [...GAS, 'bomba', 'abastecer', 'álcool', 'diesel'],
    icon: 'box',
    height: 1.5,
    category: 'structure',
  },
  {
    key: 'pos-pilar',
    label: 'Pilar da cobertura',
    keywords: [...GAS, 'pilar', 'coluna'],
    icon: 'pillar',
    height: 3,
    category: 'structure',
  },
  {
    key: 'pos-cobertura',
    label: 'Cobertura das bombas',
    keywords: [...GAS, 'cobertura', 'teto', 'marquise'],
    icon: 'roof',
    height: 0.5,
    category: 'structure',
    footprint: { width: 12, depth: 8 },
  },
  {
    key: 'pos-calibrador',
    label: 'Calibrador de pneus',
    keywords: [...GAS, 'calibrador', 'pneu', 'ar'],
    icon: 'pillar',
    height: 1.36,
    category: 'structure',
  },
  {
    key: 'pos-placa-precos',
    label: 'Totem de preços',
    keywords: [...GAS, 'placa', 'preço', 'letreiro', 'totem'],
    icon: 'monitor',
    height: 3.8,
    category: 'structure',
  },
  {
    key: 'pos-freezer-gelo',
    label: 'Freezer de gelo',
    keywords: [...GAS, 'gelo', 'freezer', 'conveniência'],
    icon: 'box',
    height: 1.06,
    category: 'furniture',
  },
];

export const INSTITUTION_PIECES: readonly CatalogEntry[] = SPECS.map(
  ({ key, footprint, ...spec }) => ({
    key,
    kind: 'prop' as const,
    style: 'modern' as const,
    visual: { type: 'model' as const, url: `${FOLDER}/${key}.gltf` },
    thumbnail: `${FOLDER}/thumbs/${key}.webp`,
    ...spec,
    ...(footprint ? { footprint } : {}),
  }),
);
