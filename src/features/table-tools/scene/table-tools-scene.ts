import type { Cell } from '@/domain';
import { surfaceAt, type HeightMap } from '@/features/scene';

/**
 * Cores e medidas da régua e do ping na cena. Como a paleta da cena e a dos tokens, não seguem o
 * tema da interface: o marcador tem a mesma cara no claro e no escuro.
 */
export const TABLE_SCENE_COLORS = {
  ruler: '#ffd27a',
  sharedRuler: '#8fd3ff',
  ping: '#ff9a3c',
} as const;

export const RULER_SHAPE = {
  /** Altura acima do chão: a linha não some dentro do piso. */
  lift: 0.08,
  lineWidth: 3,
  endRadius: 0.18,
  labelHeight: 0.6,
} as const;

export const PING_SHAPE = {
  lift: 0.05,
  ringInner: 0.32,
  ringOuter: 0.42,
  /** O anel cresce até este tamanho e some. */
  growTo: 2.6,
  /** Ondas do anel durante a vida do ping. */
  waves: 2,
  /** Quanto o anel apaga ao chegar no tamanho máximo de cada onda. */
  waveFade: 0.6,
  beamOpacity: 0.7,
  beamHeight: 3,
  beamRadius: 0.05,
  labelHeight: 1.2,
} as const;

const HALF_CELL = 0.5;

/** Ponto do mundo no centro da casa, em cima do chão que esta pessoa enxerga. */
export function cellTop(heights: HeightMap, cell: Cell, lift: number) {
  return { x: cell.x + HALF_CELL, y: surfaceAt(heights, cell) + lift, z: cell.z + HALF_CELL };
}
