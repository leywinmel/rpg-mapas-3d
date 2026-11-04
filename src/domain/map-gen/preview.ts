/**
 * Prévia barata do gerador: a classe do terreno (rua, prédio, praça...) em no máximo
 * PREVIEW_MAX_SAMPLES pontos por lado. Só precisa da planta, sem montar paredes e peças, por
 * isso sai rápido até no 1000×1000.
 */
import type { GridSize } from '../grid';
import type { SettlementStyle } from './kits';
import { planSettlement, type TerrainClass } from './layout';
import { profileForSize, type SettlementProfile } from './presets';

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

export function previewSettlement(options: PreviewOptions): SettlementPreview {
  const { size } = options;
  const plan = planSettlement({ ...options, profile: options.profile ?? profileForSize(size) });
  const step = Math.max(1, Math.ceil(Math.max(size.width, size.depth) / PREVIEW_MAX_SAMPLES));
  const columns = Math.ceil(size.width / step);
  const rows = Math.ceil(size.depth / step);
  const classes: TerrainClass[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = Math.min(column * step + Math.floor(step / 2), size.width - 1);
      const z = Math.min(row * step + Math.floor(step / 2), size.depth - 1);
      classes.push(plan.classes[z * size.width + x] as TerrainClass);
    }
  }
  return { columns, rows, classes, buildings: plan.buildings.length };
}
