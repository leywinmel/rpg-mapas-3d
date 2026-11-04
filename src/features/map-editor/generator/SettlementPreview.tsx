import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { previewSettlement, type SettlementPreview as Preview } from '@/domain/map-gen';
import { previewPalette, type PreviewPalette } from './preview-colors';
import { presetSize, type GenerateMapInput } from './generate-form';
import styles from './GenerateMap.module.css';

function paint(canvas: HTMLCanvasElement, preview: Preview, palette: PreviewPalette): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, preview.columns, preview.rows);
  preview.classes.forEach((terrain, index) => {
    const color = palette[terrain];
    if (!color) return;
    context.fillStyle = color;
    context.fillRect(index % preview.columns, Math.floor(index / preview.columns), 1, 1);
  });
}

type Props = { input: Pick<GenerateMapInput, 'style' | 'preset' | 'seed'> };

/**
 * Prévia do mapa visto do alto: só a planta (ruas, quadras, prédios), sem montar paredes e
 * peças, por isso acompanha a semente enquanto o mestre digita.
 */
export function SettlementPreview({ input }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const deferred = useDeferredValue(input);
  const preview = useMemo(
    () =>
      previewSettlement({
        style: deferred.style,
        size: presetSize(deferred.preset),
        seed: deferred.seed,
      }),
    [deferred.style, deferred.preset, deferred.seed],
  );
  const palette = useMemo(() => previewPalette(deferred.style), [deferred.style]);

  useEffect(() => {
    if (canvas.current) paint(canvas.current, preview, palette);
  }, [preview, palette]);

  const size = presetSize(deferred.preset);
  return (
    <figure className={styles.previewFrame}>
      <canvas
        ref={canvas}
        className={styles.preview}
        width={preview.columns}
        height={preview.rows}
        role="img"
        aria-label={`Prévia do mapa visto de cima, com ${preview.buildings} prédios`}
      />
      <figcaption className={styles.caption}>
        {size.width} × {size.depth} casas · {preview.buildings} prédios
      </figcaption>
    </figure>
  );
}
