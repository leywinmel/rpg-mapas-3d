import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import { logger } from '@/lib/logger';
import { allLabelTexts } from '../../physics/shapes';
import { LABEL_COLOR, LABEL_OUTLINE_COLOR } from './palette';

const CELL_SIZE = 128;
const COLUMNS = 8;
const FONT_FAMILY = `Cinzel, Georgia, 'Times New Roman', serif`;
const FONT_WEIGHT = 700;
/** Quanto da célula o número ocupa no máximo (largura e altura). */
const TEXT_FILL = 0.74;
const OUTLINE_WIDTH = 9;
const UNDERLINE_WIDTH = 7;
/** Distância do traço até o centro do número, como fração do tamanho da letra. */
const UNDERLINE_OFFSET = 0.46;
/** 6 e 9 ganham um traço embaixo para não se confundirem de cabeça para baixo. */
const UNDERLINED_TEXTS = new Set(['6', '9']);
const MAX_ANISOTROPY = 4;

export type LabelRect = { u0: number; v0: number; u1: number; v1: number };

const texts = allLabelTexts();
const rows = Math.ceil(texts.length / COLUMNS);

/** Onde cada número está na textura (coordenadas UV; v cresce para cima). */
export function labelRect(text: string): LabelRect {
  const index = texts.indexOf(text);
  if (index < 0) throw new Error(`Número "${text}" fora da textura dos dados.`);
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return {
    u0: column / COLUMNS,
    u1: (column + 1) / COLUMNS,
    v1: 1 - row / rows,
    v0: 1 - (row + 1) / rows,
  };
}

function fontFor(size: number): string {
  return `${FONT_WEIGHT} ${size}px ${FONT_FAMILY}`;
}

function paint(context: CanvasRenderingContext2D): void {
  context.clearRect(0, 0, COLUMNS * CELL_SIZE, rows * CELL_SIZE);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';

  texts.forEach((text, index) => {
    const centerX = (index % COLUMNS) * CELL_SIZE + CELL_SIZE / 2;
    const centerY = Math.floor(index / COLUMNS) * CELL_SIZE + CELL_SIZE / 2;

    // Começa grande e encolhe até o número caber na célula.
    let size = CELL_SIZE * TEXT_FILL;
    context.font = fontFor(size);
    const width = context.measureText(text).width;
    if (width > CELL_SIZE * TEXT_FILL) size *= (CELL_SIZE * TEXT_FILL) / width;
    context.font = fontFor(size);

    context.lineWidth = OUTLINE_WIDTH;
    context.strokeStyle = LABEL_OUTLINE_COLOR;
    context.strokeText(text, centerX, centerY);
    context.fillStyle = LABEL_COLOR;
    context.fillText(text, centerX, centerY);

    if (UNDERLINED_TEXTS.has(text)) {
      const half = context.measureText(text).width / 2;
      const y = centerY + size * UNDERLINE_OFFSET;
      context.lineWidth = UNDERLINE_WIDTH;
      context.strokeStyle = LABEL_COLOR;
      context.beginPath();
      context.moveTo(centerX - half, y);
      context.lineTo(centerX + half, y);
      context.stroke();
    }
  });
}

let atlas: CanvasTexture | null = null;

/**
 * Textura com todos os números dos dados numa grade. É uma só para todos os dados e
 * é repintada quando a fonte dos títulos termina de carregar.
 */
export function getLabelAtlas(onRepaint?: () => void): CanvasTexture {
  if (atlas) return atlas;
  const canvas = document.createElement('canvas');
  canvas.width = COLUMNS * CELL_SIZE;
  canvas.height = rows * CELL_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador não consegue desenhar os números dos dados.');
  paint(context);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = MAX_ANISOTROPY;
  atlas = texture;

  // A fonte pode chegar depois do primeiro desenho; pintar de novo quando chegar.
  void document.fonts
    ?.load(fontFor(CELL_SIZE))
    .then(() => {
      paint(context);
      texture.needsUpdate = true;
      onRepaint?.();
    })
    .catch((error: unknown) => {
      // Sem a fonte dos títulos os números saem na fonte reserva; o dado continua legível.
      logger.warn('A fonte dos números dos dados não carregou.', { feature: 'dice' }, error);
    });
  return texture;
}
