/**
 * Imagem PNG da vista atual, no tamanho e na qualidade em que a cena está na tela (a mesma
 * densidade de pixels e as mesmas sombras). O jogador só tem na cena o que o banco mandou e a
 * névoa opaca por cima: a imagem dele não tem como mostrar o que está coberto.
 *
 * O canvas 3D não guarda o último quadro (preserveDrawingBuffer desligado, que é mais rápido):
 * por isso a captura desenha um quadro e copia na mesma volta, antes de o navegador limpar.
 */
import { Line, type Camera, type Object3D, type Scene, type WebGLRenderer } from 'three';
import { isSceneUi } from '@/features/scene/scene-ui';
import { PNG_MIME_TYPE } from '../constants';
import type { PngOptions } from '../hooks/export-store';

/** Etiquetas HTML sobre a cena (nome e vida dos tokens): ficam fora do canvas 3D. */
const LABEL_SELECTOR = '[data-scene-label]';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

/** Esconde a grade, as molduras e o que está marcado como interface; devolve o que escondeu. */
function hideSceneUi(scene: Scene): Object3D[] {
  const hidden: Object3D[] = [];
  scene.traverse((object) => {
    if (!object.visible) return;
    if (object instanceof Line || isSceneUi(object.userData)) {
      object.visible = false;
      hidden.push(object);
    }
  });
  return hidden;
}

type Frame = { origin: DOMRect; scale: number };

function roundedBox(
  context: CanvasRenderingContext2D,
  rect: DOMRect,
  frame: Frame,
  radius: number,
) {
  const x = (rect.left - frame.origin.left) * frame.scale;
  const y = (rect.top - frame.origin.top) * frame.scale;
  context.beginPath();
  context.roundRect(
    x,
    y,
    rect.width * frame.scale,
    rect.height * frame.scale,
    radius * frame.scale,
  );
}

/** Fundo e borda do elemento, com as cores que o tema deu a ele (nada de cor fixa aqui). */
function drawBox(context: CanvasRenderingContext2D, element: Element, frame: Frame) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
  const border = Number.parseFloat(style.borderTopWidth) || 0;
  if (style.backgroundColor !== TRANSPARENT) {
    roundedBox(context, rect, frame, radius);
    context.fillStyle = style.backgroundColor;
    context.fill();
  }
  if (border > 0 && style.borderTopColor !== TRANSPARENT) {
    roundedBox(context, rect, frame, radius);
    context.lineWidth = border * frame.scale;
    context.strokeStyle = style.borderTopColor;
    context.stroke();
  }
}

/** O texto que é filho direto do elemento, na fonte e cor dele, cortado na largura da caixa. */
function drawText(context: CanvasRenderingContext2D, element: Element, frame: Frame) {
  const text = [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim();
  if (!text) return;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const fontSize = Number.parseFloat(style.fontSize) * frame.scale;
  context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  context.fillStyle = style.color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  const x = (rect.left + rect.width / 2 - frame.origin.left) * frame.scale;
  const y = (rect.top + rect.height / 2 - frame.origin.top) * frame.scale;
  context.fillText(text, x, y, rect.width * frame.scale);
}

function isShown(element: Element): boolean {
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

/**
 * Redesenha as etiquetas HTML no lugar em que estão na tela. É texto do React lido do DOM e
 * pintado como texto no canvas: nada vira HTML [#53].
 */
function drawLabels(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const host = canvas.parentElement?.parentElement ?? canvas.parentElement;
  if (!host) return;
  const origin = canvas.getBoundingClientRect();
  if (origin.width === 0) return;
  const frame: Frame = { origin, scale: canvas.width / origin.width };
  for (const label of host.querySelectorAll(LABEL_SELECTOR)) {
    if (!isShown(label)) continue;
    const elements = [label, ...label.querySelectorAll('*')].filter(
      (element) => !(element instanceof SVGElement),
    );
    for (const element of elements) {
      drawBox(context, element, frame);
      drawText(context, element, frame);
    }
  }
}

function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('O navegador não gerou a imagem.'));
    }, PNG_MIME_TYPE);
  });
}

export type CaptureStage = { gl: WebGLRenderer; scene: Scene; camera: Camera };

export function capturePng(
  { gl, scene, camera }: CaptureStage,
  options: PngOptions,
): Promise<Blob> {
  const source = gl.domElement;
  const output = document.createElement('canvas');
  output.width = source.width;
  output.height = source.height;
  const context = output.getContext('2d');
  if (!context) return Promise.reject(new Error('Sem contexto 2D para montar a imagem.'));

  const hidden = options.hideUi ? hideSceneUi(scene) : [];
  try {
    gl.render(scene, camera);
    context.drawImage(source, 0, 0);
  } finally {
    for (const object of hidden) object.visible = true;
  }
  if (!options.hideUi) drawLabels(context, source);
  return toPngBlob(output);
}
