import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import {
  isWildKind,
  previewSettlement,
  previewWilds,
  type MapKind,
  type SettlementStyle,
} from '@/domain/map-gen';
import type { GridSize } from '@/domain';
import { pieceCatalog } from '@/features/scene';
import { previewPalette } from './preview-colors';
import { presetSize, type GenerateMapInput } from './generate-form';
import styles from './GenerateMap.module.css';

/** O que a prévia pinta: a cor de cada ponto (null = transparente) e a legenda. */
type Painted = {
  readonly columns: number;
  readonly rows: number;
  readonly colors: readonly (string | null)[];
  readonly count: string;
};

const FEATURE_WORDS: Readonly<Record<MapKind, string>> = {
  settlement: 'prédios',
  dungeon: 'salas',
  cave: 'caverna ligada',
  desert: 'ruínas',
  port: 'cais',
};

function farColor(key: string | null): string | null {
  return key === null ? null : (pieceCatalog.get(key)?.farColor ?? null);
}

function paintedPreview(
  kind: MapKind,
  style: SettlementStyle,
  size: GridSize,
  seed: number,
): Painted {
  if (isWildKind(kind)) {
    const preview = previewWilds({ kind, size, seed });
    // Cor de longe por peça, calculada uma vez: a amostra repete poucas peças.
    const cache = new Map<string | null, string | null>();
    const colors = preview.tiles.map((tile) => {
      if (!cache.has(tile)) cache.set(tile, farColor(tile));
      return cache.get(tile)!;
    });
    const count =
      kind === 'cave' ? FEATURE_WORDS.cave : `${preview.features} ${FEATURE_WORDS[kind]}`;
    return { columns: preview.columns, rows: preview.rows, colors, count };
  }
  const preview = previewSettlement({ style, size, seed });
  const palette = previewPalette(style);
  return {
    columns: preview.columns,
    rows: preview.rows,
    colors: preview.classes.map((terrain) => palette[terrain] ?? null),
    count: `${preview.buildings} ${FEATURE_WORDS.settlement}`,
  };
}

function paint(canvas: HTMLCanvasElement, preview: Painted): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, preview.columns, preview.rows);
  preview.colors.forEach((color, index) => {
    if (!color) return;
    context.fillStyle = color;
    context.fillRect(index % preview.columns, Math.floor(index / preview.columns), 1, 1);
  });
}

type Props = { input: Pick<GenerateMapInput, 'kind' | 'style' | 'preset' | 'seed'> };

/**
 * Prévia do mapa visto do alto: só a planta (ruas e prédios, salas e corredores...), sem montar
 * paredes e peças, por isso acompanha a semente enquanto o mestre digita.
 */
export function SettlementPreview({ input }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const deferred = useDeferredValue(input);
  const preview = useMemo(
    () => paintedPreview(deferred.kind, deferred.style, presetSize(deferred.preset), deferred.seed),
    [deferred.kind, deferred.style, deferred.preset, deferred.seed],
  );

  useEffect(() => {
    if (canvas.current) paint(canvas.current, preview);
  }, [preview]);

  const size = presetSize(deferred.preset);
  return (
    <figure className={styles.previewFrame}>
      <canvas
        ref={canvas}
        className={styles.preview}
        width={preview.columns}
        height={preview.rows}
        role="img"
        aria-label={`Prévia do mapa visto de cima, com ${preview.count}`}
      />
      <figcaption className={styles.caption}>
        {size.width} × {size.depth} casas · {preview.count}
      </figcaption>
    </figure>
  );
}
