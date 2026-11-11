/**
 * Climas prontos da cena. O documento guarda só a chave do clima, a cor da
 * neblina e a intensidade geral; aqui cada clima vira cores e forças de luz.
 */
import {
  DEFAULT_AMBIENCE,
  DEFAULT_TABLE_WEATHER,
  type Ambience,
  type DayPhase,
  type TableWeather,
  type WeatherKind,
} from '@/domain';

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

/**
 * Neblina proporcional ao mapa: um 100×100 continua visível de longe, um 8×8 some no escuro. A
 * hora e o tempo da mesa mudam o alcance; o recorte dos pedaços usa o mesmo valor.
 */
export function fogRange(
  ambience: Ambience,
  mapSpan: number,
  table: TableWeather = DEFAULT_TABLE_WEATHER,
): FogRange {
  const reach = sceneLook(ambience, table).fogReach;
  const base = Math.max(mapSpan, MIN_FOG_SPAN);
  return { near: base * FOG_NEAR_FACTOR * reach, far: base * FOG_FAR_FACTOR * reach };
}

/** Luzes da hora do dia, no lugar das do clima do mapa (RPG-38). `map` não troca nada. */
type DayLighting = Omit<AmbiencePreset, 'key' | 'label'>;

export const DAY_PHASE_LIGHTING: Readonly<Record<Exclude<DayPhase, 'map'>, DayLighting>> = {
  day: {
    skyColor: '#c4d8ff',
    groundColor: '#4a4232',
    fillIntensity: 1.1,
    keyColor: '#fff1d6',
    keyIntensity: 2.3,
    rimColor: '#a9c6ff',
    rimIntensity: 0.45,
    fogReach: 1.7,
    fogColor: '#7f93a8',
  },
  dusk: {
    skyColor: '#8d6a9c',
    groundColor: '#2a1916',
    fillIntensity: 0.7,
    keyColor: '#ff8f4f',
    keyIntensity: 2,
    rimColor: '#6f6cff',
    rimIntensity: 0.55,
    fogReach: 1.25,
    fogColor: '#33202c',
  },
  night: {
    skyColor: '#2e3d6e',
    groundColor: '#08080f',
    fillIntensity: 0.5,
    keyColor: '#a3b4ff',
    keyIntensity: 0.95,
    rimColor: '#5d6cff',
    rimIntensity: 0.5,
    fogReach: 0.8,
    fogColor: '#04060c',
  },
};

/** Chuva escurece a luz, encurta a visão e puxa a neblina para o cinza da água. */
type WeatherShift = { light: number; reach: number; tint: string; tintAmount: number };

export const WEATHER_SHIFT: Readonly<Record<WeatherKind, WeatherShift>> = {
  clear: { light: 1, reach: 1, tint: '#000000', tintAmount: 0 },
  rain: { light: 0.72, reach: 0.78, tint: '#4a5566', tintAmount: 0.35 },
  storm: { light: 0.55, reach: 0.62, tint: '#262d3a', tintAmount: 0.5 },
};

const HEX_CHANNELS = [1, 3, 5] as const;
const HEX_BASE = 16;
const CHANNEL_MAX = 255;

/** Mistura duas cores #rrggbb (0 = a primeira, 1 = a segunda). */
export function mixHex(from: string, to: string, amount: number): string {
  const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + 2), HEX_BASE);
  return `#${HEX_CHANNELS.map((start) => {
    const value = Math.round(channel(from, start) * (1 - amount) + channel(to, start) * amount);
    return Math.min(Math.max(value, 0), CHANNEL_MAX).toString(HEX_BASE).padStart(2, '0');
  }).join('')}`;
}

/** O que a cena desenha: as luzes, a cor do fundo e o alcance da neblina. */
export type SceneLook = DayLighting & { lightScale: number };

/**
 * Junta o clima do mapa com o tempo e a hora da mesa. Sem hora escolhida, vale a luz do mapa
 * (inclusive a cor da neblina que o mestre pintou); com hora, a hora manda.
 */
export function sceneLook(ambience: Ambience, table: TableWeather): SceneLook {
  const base =
    table.dayPhase === 'map'
      ? { ...resolvePreset(ambience.preset), fogColor: ambience.fogColor }
      : DAY_PHASE_LIGHTING[table.dayPhase];
  const shift = WEATHER_SHIFT[table.weather];
  return {
    skyColor: base.skyColor,
    groundColor: base.groundColor,
    fillIntensity: base.fillIntensity,
    keyColor: base.keyColor,
    keyIntensity: base.keyIntensity,
    rimColor: base.rimColor,
    rimIntensity: base.rimIntensity,
    fogReach: base.fogReach * shift.reach,
    fogColor: mixHex(base.fogColor, shift.tint, shift.tintAmount),
    lightScale: ambience.light * shift.light,
  };
}
