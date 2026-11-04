/**
 * Desenho do minimapa: o chão do mapa visto de cima, em no máximo MINIMAP_MAX_SAMPLES pontos
 * por lado. Num mapa de 1000×1000 isso lê ~16 mil casas (não um milhão), barato o bastante
 * para refazer a cada pincelada.
 */
import type { Cell } from '@/domain';
import { terrainAt, type MapModel } from '@/domain/map-v2';
import { pieceCatalog } from '@/features/scene';

export const MINIMAP_MAX_SAMPLES = 128;
/** Abaixo disso o mapa inteiro já cabe na tela: o minimapa só ocuparia espaço. */
export const MINIMAP_MIN_SPAN = 48;

export type MinimapImage = {
  readonly columns: number;
  readonly rows: number;
  /** Casas por ponto do minimapa. */
  readonly step: number;
  /** Cor de cada ponto, linha por linha; nulo = casa sem chão (buraco). */
  readonly colors: readonly (string | null)[];
};

export function showsMinimap(model: MapModel): boolean {
  return Math.max(model.size.width, model.size.depth) >= MINIMAP_MIN_SPAN;
}

/** Cor de longe do chão (a mesma que a cena usa no desenho distante). */
function floorColor(model: MapModel, cell: Cell): string | null {
  const tile = terrainAt(model, cell)?.tile;
  if (!tile) return null;
  return pieceCatalog.get(tile)?.farColor ?? null;
}

export function minimapImage(model: MapModel): MinimapImage {
  const { width, depth } = model.size;
  const step = Math.max(1, Math.ceil(Math.max(width, depth) / MINIMAP_MAX_SAMPLES));
  const columns = Math.ceil(width / step);
  const rows = Math.ceil(depth / step);
  const colors: (string | null)[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      // O centro do bloco de casas representa o bloco.
      const cell = {
        x: Math.min(column * step + Math.floor(step / 2), width - 1),
        z: Math.min(row * step + Math.floor(step / 2), depth - 1),
      };
      colors.push(floorColor(model, cell));
    }
  }
  return { columns, rows, step, colors };
}

/** Casa do mapa sob o ponto clicado, a partir da fração (0 a 1) da largura e da altura. */
export function cellAtFraction(model: MapModel, fx: number, fz: number): Cell {
  const clamp = (value: number, size: number) =>
    Math.min(Math.max(Math.floor(value * size), 0), size - 1);
  return { x: clamp(fx, model.size.width), z: clamp(fz, model.size.depth) };
}
