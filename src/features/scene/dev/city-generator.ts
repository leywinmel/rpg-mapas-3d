/**
 * Cidade cheia para MEDIR a cena [#99]: é o gerador de vilas e cidades do produto
 * (src/domain/map-gen), com uma semente fixa. Um gerador só: o que a medição mede é o que o
 * mestre recebe ao gerar uma cidade.
 */
import type { GridSize } from '@/domain';
import { generateMap, type MapKind, type SettlementStyle } from '@/domain/map-gen';
import type { MapModel } from '@/domain/map-v2';

export type CityOptions = {
  readonly size: GridSize;
  readonly seed: number;
  readonly style?: SettlementStyle;
  /** Masmorra, caverna e deserto também, para medir a cena deles [#99]. */
  readonly kind?: MapKind;
};

/** Uma cidade do tamanho pedido. Mesma semente, estilo e tamanho: mesma cidade. */
export function generateCity({
  size,
  seed,
  style = 'medieval',
  kind = 'settlement',
}: CityOptions): MapModel {
  return generateMap({ kind, style, size, seed }).model;
}

export type CityCounts = { cells: number; walls: number; pieces: number; chunks: number };

/** O tamanho da cidade gerada, para a medição registrar o que estava na tela. */
export function countCity(model: MapModel): CityCounts {
  let walls = 0;
  let pieces = 0;
  for (const chunk of model.chunks.values()) {
    walls += chunk.walls.length;
    pieces += chunk.pieces.length;
  }
  return {
    cells: model.size.width * model.size.depth,
    walls,
    pieces,
    chunks: model.chunks.size,
  };
}
