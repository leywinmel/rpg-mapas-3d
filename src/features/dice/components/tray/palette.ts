import type { DieKind } from '../../physics/shapes';

/**
 * Cores da bandeja 3D. O WebGL não lê variáveis de CSS, então ficam aqui, num tom
 * sombrio que combina com o tema escuro (violeta frio e brasa quente) e continua
 * legível no claro, porque a bandeja é um objeto da mesa e não parte do painel.
 */
export const DIE_COLORS: Readonly<Record<DieKind, string>> = {
  d4: '#8c3a3f',
  d6: '#5a4aa8',
  d8: '#2d7a74',
  d10: '#4f7d3c',
  d12: '#3c64a8',
  d20: '#a8832e',
  'd100-tens': '#9c4a7e',
  'd100-units': '#b8628f',
};

export const DIE_EDGE_COLOR = '#0d0b14';
/** Cor do número impresso e do contorno que garante contraste em qualquer dado. */
export const LABEL_COLOR = '#f6efdc';
export const LABEL_OUTLINE_COLOR = '#14101c';

export const TRAY_FELT_COLOR = '#43385f';
export const TRAY_RIM_COLOR = '#6a5a8c';
export const TRAY_LIGHT_COLOR = '#d9ccff';
export const TRAY_EMBER_COLOR = '#ffb066';
