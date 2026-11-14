/**
 * Prévia barata do gerador: a classe do terreno (rua, prédio, praça...) em no máximo
 * PREVIEW_MAX_SAMPLES pontos por lado. Só precisa da planta, sem montar paredes e peças, por
 * isso sai rápido até no 1000×1000.
 */
import type { GridSize } from '../grid';
import type { SettlementStyle } from './kits';
import { planSettlement, type TerrainClass } from './layout';
import { profileForSize, type SettlementProfile } from './presets';
import { planWilds, type WildOptions } from './wilds';

export const PREVIEW_MAX_SAMPLES = 128;

export type SettlementPreview = {
  readonly columns: number;
  readonly rows: number;
  /** Classe de cada ponto, linha a linha. */
  readonly classes: readonly TerrainClass[];
  readonly buildings: number;
};

export type PreviewOptions = {
  readonly style: SettlementStyle;
  readonly size: GridSize;
  readonly seed: number;
  readonly profile?: SettlementProfile;
};

/** No máximo PREVIEW_MAX_SAMPLES pontos por lado, cada um no meio do seu quadrado. */
function sampleGrid<T>(size: GridSize, at: (cell: number) => T) {
  const step = Math.max(1, Math.ceil(Math.max(size.width, size.depth) / PREVIEW_MAX_SAMPLES));
  const columns = Math.ceil(size.width / step);
  const rows = Math.ceil(size.depth / step);
  const values: T[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = Math.min(column * step + Math.floor(step / 2), size.width - 1);
      const z = Math.min(row * step + Math.floor(step / 2), size.depth - 1);
      values.push(at(z * size.width + x));
    }
  }
  return { columns, rows, values };
}

export function previewSettlement(options: PreviewOptions): SettlementPreview {
  const { size } = options;
  const plan = planSettlement({ ...options, profile: options.profile ?? profileForSize(size) });
  const { columns, rows, values } = sampleGrid(size, (cell) => plan.classes[cell] as TerrainClass);
  return { columns, rows, classes: values, buildings: plan.buildings.length };
}

export type WildPreview = {
  readonly columns: number;
  readonly rows: number;
  /** Peça de chão de cada ponto, linha a linha (null = rocha maciça). */
  readonly tiles: readonly (string | null)[];
  readonly features: number;
};

/** Prévia de masmorra, caverna ou deserto: a peça de chão em cada ponto da amostra. */
export function previewWilds(options: WildOptions): WildPreview {
  const { size } = options;
  const plan = planWilds(options);
  const { columns, rows, values } = sampleGrid(size, (cell) => plan.tiles[cell] ?? null);
  return { columns, rows, tiles: values, features: plan.features };
}
