/**
 * Quem põe as peças de um mapa pronto casa por casa (RPG-71): anota as casas que cada peça já
 * ocupa, girada, e para na hora se duas peças caírem na mesma casa ou uma sair do mapa. O erro
 * aparece no teste, com o nome da peça, em vez de virar uma pilha na cena [#93].
 */
import type { Cell } from '../../grid';
import { rotatedFootprint, type Footprint } from '../../map-v2';
import { propFootprint } from '../kits';
import type { Sketch } from './sketch';

/**
 * Põe a peça com a âncora na casa; `rotation` em quartos de volta (0 olha para +z). Sem
 * `footprint`, o da tabela de peças grandes (ou uma casa).
 */
export type Place = (piece: string, cell: Cell, rotation?: number, footprint?: Footprint) => void;

export function createPlacer(sketch: Sketch): Place {
  const taken = new Map<string, string>();
  return (piece, cell, rotation = 0, footprint = propFootprint(piece)) => {
    const size = rotatedFootprint(footprint, rotation);
    for (let dz = 0; dz < size.depth; dz += 1) {
      for (let dx = 0; dx < size.width; dx += 1) {
        const x = cell.x + dx;
        const z = cell.z + dz;
        if (x < 0 || z < 0 || x >= sketch.size.width || z >= sketch.size.depth) {
          throw new Error(`${piece} sai do mapa em ${x},${z}.`);
        }
        const key = `${x},${z}`;
        const other = taken.get(key);
        if (other) throw new Error(`${piece} cai em ${key}, onde já está ${other}.`);
        taken.set(key, piece);
      }
    }
    sketch.piece(piece, cell, { rotation, footprint });
  };
}
