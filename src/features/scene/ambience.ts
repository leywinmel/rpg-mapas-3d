/**
 * Climas prontos da cena. O documento guarda só a chave do clima, a cor da
 * neblina e a intensidade geral; aqui cada clima vira cores e forças de luz.
 */
import { DEFAULT_AMBIENCE, type Ambience } from '@/domain';

export type AmbiencePreset = {
  key: string;
  label: string;
  /** Luz de preenchimento (céu/chão), fria e fraca. */
  skyColor: string;
  groundColor: string;
  fillIntensity: number;
  /** Luz principal, baixa e quente, que desenha as sombras. */
  keyColor: string;
  keyIntensity: number;
  /** Contraluz fria que separa as silhuetas do fundo. */
  rimColor: string;
  rimIntensity: number;
  /** Neblina: 1 = padrão; menor fecha a visão, maior abre. */
  fogReach: number;
  /** Cor sugerida para a neblina ao escolher o clima. */
  fogColor: string;
};

export const AMBIENCE_PRESETS: readonly AmbiencePreset[] = [
  {
    key: 'masmorra',
    label: 'Masmorra',
    skyColor: '#5b4f80',
    groundColor: '#1a1420',
    fillIntensity: 0.55,
    keyColor: '#ffb27a',
    keyIntensity: 1.7,
    rimColor: '#6a7bff',
    rimIntensity: 0.45,
    fogReach: 1,
    fogColor: DEFAULT_AMBIENCE.fogColor,
  },
  {
    key: 'cripta',
    label: 'Cripta ao luar',
    skyColor: '#4a5580',
    groundColor: '#111018',
    fillIntensity: 0.45,
    keyColor: '#c9c4ff',
    keyIntensity: 1.1,
    rimColor: '#7f6aff',
    rimIntensity: 0.5,
    fogReach: 0.75,
    fogColor: '#0a0b14',
  },
  {
    key: 'caverna',
    label: 'Caverna',
    skyColor: '#3d3550',
    groundColor: '#140f0c',
    fillIntensity: 0.35,
    keyColor: '#ff9a3c',
    keyIntensity: 1.4,
    rimColor: '#4f5a99',
    rimIntensity: 0.3,
    fogReach: 0.65,
    fogColor: '#0c0908',
  },
  {
    key: 'floresta',
    label: 'Floresta sombria',
    skyColor: '#56708a',
    groundColor: '#18200f',
    fillIntensity: 0.7,
    keyColor: '#ffd6a0',
    keyIntensity: 1.5,
    rimColor: '#7fa0ff',
    rimIntensity: 0.4,
    fogReach: 1.2,
    fogColor: '#0e1410',
  },
  {
    key: 'taverna',
    label: 'Taverna',
    skyColor: '#6b5040',
    groundColor: '#1d140e',
    fillIntensity: 0.75,
    keyColor: '#ffb070',
    keyIntensity: 1.9,
    rimColor: '#8a7bd0',
    rimIntensity: 0.35,
    fogReach: 1.4,
    fogColor: '#140d0a',
  },
];

const DEFAULT_PRESET = AMBIENCE_PRESETS[0]!;

/** Clima desconhecido (ex: mapa importado de versão futura) cai no padrão em vez de quebrar. */
export function resolvePreset(key: string): AmbiencePreset {
  return AMBIENCE_PRESETS.find((preset) => preset.key === key) ?? DEFAULT_PRESET;
}

export type FogRange = { near: number; far: number };

const MIN_FOG_SPAN = 8;
const FOG_NEAR_FACTOR = 1;
const FOG_FAR_FACTOR = 2.8;

/** Neblina proporcional ao mapa: um 100×100 continua visível de longe, um 8×8 some no escuro. */
export function fogRange(ambience: Ambience, mapSpan: number): FogRange {
  const reach = resolvePreset(ambience.preset).fogReach;
  const base = Math.max(mapSpan, MIN_FOG_SPAN);
  return { near: base * FOG_NEAR_FACTOR * reach, far: base * FOG_FAR_FACTOR * reach };
}
