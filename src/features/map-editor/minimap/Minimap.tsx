import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import type { MapModel } from '@/domain/map-v2';
import { useCameraFocus } from '@/features/scene';
import { cellAtFraction, minimapImage, type MinimapImage } from './minimap-image';
import styles from './Minimap.module.css';

const PERCENT = 100;
/** Clique pelo teclado (Enter/Espaço) não tem posição: leva a câmera ao meio do mapa. */
const KEYBOARD_CLICK_DETAIL = 0;
const MAP_CENTER_FRACTION = 0.5;

function paint(canvas: HTMLCanvasElement, image: MinimapImage): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, image.columns, image.rows);
  image.colors.forEach((color, index) => {
    if (!color) return;
    context.fillStyle = color;
    context.fillRect(index % image.columns, Math.floor(index / image.columns), 1, 1);
  });
}

/**
 * Minimapa do chão visto de cima, com a marca de onde a câmera está olhando. Um clique leva
 * a câmera até aquele ponto: num mapa de 1000×1000, arrastar a câmera até a outra ponta
 * levaria um bom tempo.
 */
export function Minimap({ model }: { model: MapModel }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useMemo(() => minimapImage(model), [model]);
  const view = useCameraFocus((state) => state.view);
  const requestFocus = useCameraFocus((state) => state.requestFocus);
  const { width, depth } = model.size;

  useEffect(() => {
    if (canvas.current) paint(canvas.current, image);
  }, [image]);

  const goTo = (event: MouseEvent<HTMLButtonElement>) => {
    const keyboard = event.detail === KEYBOARD_CLICK_DETAIL;
    const box = event.currentTarget.getBoundingClientRect();
    const fx = keyboard ? MAP_CENTER_FRACTION : (event.clientX - box.left) / box.width;
    const fz = keyboard ? MAP_CENTER_FRACTION : (event.clientY - box.top) / box.height;
    const cell = cellAtFraction(model, fx, fz);
    requestFocus({ x: cell.x + MAP_CENTER_FRACTION, z: cell.z + MAP_CENTER_FRACTION });
  };

  return (
    <button
      type="button"
      className={styles.minimap}
      style={{ aspectRatio: `${width} / ${depth}` }}
      aria-label="Minimapa: clique num ponto para levar a câmera até lá"
      title="Clique para levar a câmera até lá"
      onClick={goTo}
    >
      <canvas
        ref={canvas}
        className={styles.image}
        width={image.columns}
        height={image.rows}
        aria-hidden="true"
      />
      {view && (
        <span
          className={styles.marker}
          style={{ left: `${(view.x / width) * PERCENT}%`, top: `${(view.z / depth) * PERCENT}%` }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
