/**
 * Tamanhos prontos do gerador e o jeito de cada um (vila espalhada ou cidade densa), mais os
 * mapas de exemplo, que são só o gerador com uma semente fixa.
 */
import type { GridSize } from '../grid';
import type { SettlementStyle } from './kits';

/** Como o lugar é: muda o tamanho dos quarteirões, a largura das ruas e a altura dos prédios. */
export type SettlementProfile = {
  /** Lado mínimo e máximo de um quarteirão, em casas. */
  readonly minBlock: number;
  readonly maxBlock: number;
  /** Rua comum: 4 casas = duas faixas de carro (cada carro tem 2 de largura). */
  readonly streetWidth: number;
  /** Avenida: 6 casas, cabe um caminhão (3 de largura) estacionado e uma faixa livre. */
  readonly avenueWidth: number;
  /** Quantos níveis da divisão em quarteirões viram avenida (0 = nenhuma). */
  readonly avenueLevels: number;
  /** Rua de terra (vila) em vez da rua calçada. */
  readonly dirtRoads: boolean;
  readonly sidewalks: boolean;
  readonly minStories: number;
  readonly maxStories: number;
  /** Chance de cada lote ter prédio (o resto vira quintal com árvores). */
  readonly buildingChance: number;
  /** Chance de um quarteirão virar praça ou parque. */
  readonly parkChance: number;
  /** Chance de cada vaga da rua ter um veículo estacionado. */
  readonly vehicleChance: number;
  /** Fundo do lote, em casas (o prédio fica na frente dele). */
  readonly lotDepth: number;
  /** Espaço entre prédios vizinhos, em casas (pelo menos 1: paredes não se encostam). */
  readonly minGap: number;
  readonly maxGap: number;
  /** Lado mínimo e máximo de um prédio. */
  readonly minSide: number;
  readonly maxSide: number;
  /** Margem de campo em volta do mapa. */
  readonly border: number;
};

export type SizePresetId = 'village' | 'town' | 'city' | 'metropolis';

export type SizePreset = {
  readonly id: SizePresetId;
  readonly label: string;
  readonly side: number;
  readonly profile: SettlementProfile;
};

const VILLAGE: SettlementProfile = {
  minBlock: 18,
  maxBlock: 30,
  streetWidth: 4,
  avenueWidth: 4,
  avenueLevels: 0,
  dirtRoads: true,
  sidewalks: false,
  minStories: 1,
  maxStories: 2,
  buildingChance: 0.7,
  parkChance: 0.15,
  vehicleChance: 0.08,
  lotDepth: 9,
  minGap: 2,
  maxGap: 4,
  minSide: 4,
  maxSide: 8,
  border: 3,
};

const TOWN: SettlementProfile = {
  minBlock: 18,
  maxBlock: 30,
  streetWidth: 4,
  avenueWidth: 6,
  avenueLevels: 1,
  dirtRoads: false,
  sidewalks: true,
  minStories: 1,
  maxStories: 3,
  buildingChance: 0.85,
  parkChance: 0.1,
  vehicleChance: 0.15,
  lotDepth: 10,
  minGap: 1,
  maxGap: 3,
  minSide: 4,
  maxSide: 10,
  border: 2,
};

const CITY: SettlementProfile = {
  minBlock: 20,
  maxBlock: 34,
  streetWidth: 4,
  avenueWidth: 6,
  avenueLevels: 2,
  dirtRoads: false,
  sidewalks: true,
  minStories: 2,
  maxStories: 6,
  buildingChance: 0.92,
  parkChance: 0.08,
  vehicleChance: 0.2,
  lotDepth: 12,
  minGap: 1,
  maxGap: 2,
  minSide: 6,
  maxSide: 12,
  border: 0,
};

export const SIZE_PRESETS: readonly SizePreset[] = [
  { id: 'village', label: 'Vila pequena', side: 64, profile: VILLAGE },
  { id: 'town', label: 'Cidadezinha', side: 160, profile: TOWN },
  { id: 'city', label: 'Cidade', side: 400, profile: CITY },
  { id: 'metropolis', label: 'Cidade grande', side: 1000, profile: CITY },
];

export function sizePreset(id: SizePresetId): SizePreset {
  return SIZE_PRESETS.find((preset) => preset.id === id) ?? SIZE_PRESETS[0]!;
}

/** O jeito para um tamanho qualquer (a página de medição gera de 100 a 1000 casas). */
export function profileForSize(size: GridSize): SettlementProfile {
  const side = Math.max(size.width, size.depth);
  const fitting = SIZE_PRESETS.filter((preset) => preset.side <= side).at(-1);
  return (fitting ?? SIZE_PRESETS[0]!).profile;
}

export type ExampleMap = {
  readonly id: string;
  readonly name: string;
  readonly style: SettlementStyle;
  readonly preset: SizePresetId;
  readonly seed: number;
};

/** Mapas de exemplo: saem do gerador com semente fixa (sempre o mesmo mapa). */
export const EXAMPLE_MAPS: readonly ExampleMap[] = [
  { id: 'vila-medieval', name: 'Vila medieval', style: 'medieval', preset: 'village', seed: 1201 },
  { id: 'bairro-moderno', name: 'Bairro moderno', style: 'modern', preset: 'town', seed: 2024 },
  {
    id: 'cidade-futurista',
    name: 'Cidade futurista',
    style: 'futurist',
    preset: 'town',
    seed: 2077,
  },
];
