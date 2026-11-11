/**
 * Chuva da cena (RPG-39). TypeScript puro: quantas gotas, a que velocidade, e a escolha de cada
 * pessoa de desligar a chuva na própria tela (decisão de 05/11: "Mestre liga, cada um desliga").
 */
import type { WeatherKind } from '@/domain';
import { logger } from '@/lib/logger';
import type { QualityLevel } from '../quality/quality';

export type RainSettings = {
  /** Gotas por casa de chão dentro da caixa da chuva. */
  dropsPerTile: number;
  /** Casas por segundo. */
  speed: number;
  /** Comprimento do risco da gota, em casas. */
  length: number;
  opacity: number;
  /** Inclinação do vento: casas de lado por casa de queda. */
  wind: number;
};

export const RAIN_SETTINGS: Readonly<Record<Exclude<WeatherKind, 'clear'>, RainSettings>> = {
  rain: { dropsPerTile: 1.6, speed: 14, length: 0.6, opacity: 0.45, wind: 0.12 },
  storm: { dropsPerTile: 3, speed: 22, length: 0.9, opacity: 0.55, wind: 0.32 },
};

/** Em PC fraco chove menos: a chuva é enfeite, não pode derrubar os quadros por segundo. */
export const RAIN_QUALITY_FACTOR: Readonly<Record<QualityLevel, number>> = {
  high: 1,
  medium: 0.6,
  low: 0.3,
};

export const MAX_RAIN_DROPS = 30_000;
/** Mapa pequeno ainda ganha uma caixa de chuva que enche a vista. */
const MIN_RAIN_BOX = 28;
const RAIN_BOX_MARGIN = 12;
const MIN_RAIN_HEIGHT = 16;
const RAIN_HEIGHT_PER_SPAN = 0.6;

export type RainBox = { width: number; height: number };

/** A caixa onde as gotas caem: o mapa com folga em volta, alta o bastante para a câmera. */
export function rainBox(mapSpan: number): RainBox {
  return {
    width: Math.max(mapSpan + RAIN_BOX_MARGIN, MIN_RAIN_BOX),
    height: Math.max(mapSpan * RAIN_HEIGHT_PER_SPAN, MIN_RAIN_HEIGHT),
  };
}

export function rainDropCount(
  kind: Exclude<WeatherKind, 'clear'>,
  box: RainBox,
  level: QualityLevel,
) {
  const wanted = box.width * box.width * RAIN_SETTINGS[kind].dropsPerTile;
  return Math.min(Math.round(wanted * RAIN_QUALITY_FACTOR[level]), MAX_RAIN_DROPS);
}

/** Relâmpago da tempestade: espera entre um e outro (s) e duração de cada clarão (s). */
export const LIGHTNING = {
  minGap: 7,
  maxGap: 16,
  flashSeconds: 0.12,
  /** No máximo dois clarões por relâmpago: bem abaixo de 3 por segundo (WCAG 2.3.1). */
  flashes: 2,
  flashGapSeconds: 0.18,
  intensity: 2.2,
  color: '#cfd8ff',
} as const;

export const RAIN_STORAGE_KEY = 'rpgmaps:rain-enabled';
export type RainStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Só o acesso ao localStorage já pode lançar erro (janela privada, cookies bloqueados). */
export function browserRainStorage(): RainStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function logStorageProblem(action: string, error: unknown): void {
  // Sem armazenamento a escolha vale só nesta aba: nada a avisar na tela.
  logger.debug('Sem armazenamento local para a chuva.', {
    feature: 'scene',
    action,
    reason: error instanceof Error ? error.name : 'unknown',
  });
}

/** A chuva vem ligada; só desliga quem pediu. */
export function readRainEnabled(storage: RainStorage | null): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(RAIN_STORAGE_KEY) !== 'off';
  } catch (error) {
    logStorageProblem('read-rain', error);
    return true;
  }
}

export function writeRainEnabled(storage: RainStorage | null, enabled: boolean): void {
  if (!storage) return;
  try {
    storage.setItem(RAIN_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch (error) {
    logStorageProblem('write-rain', error);
  }
}
