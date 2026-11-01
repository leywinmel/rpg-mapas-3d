/**
 * Casas entre dois pontos do arraste. O navegador entrega o movimento do mouse
 * em saltos; sem preencher o meio, um arraste rápido deixaria buracos no chão.
 */
import type { Cell } from '@/domain';

/**
 * Linha de casas de `from` até `to`, incluindo as duas pontas, em que cada casa
 * encosta pelo lado na seguinte. Na diagonal ela vira escada: casas que só se
 * tocam pela quina parecem soltas na câmera inclinada e deixam o caminho pintado
 * sem passagem.
 */
export function cellsOnLine(from: Cell, to: Cell): Cell[] {
  const spanX = Math.abs(to.x - from.x);
  const spanZ = Math.abs(to.z - from.z);
  const stepX = Math.sign(to.x - from.x);
  const stepZ = Math.sign(to.z - from.z);
  const cells: Cell[] = [{ x: from.x, z: from.z }];
  let { x, z } = from;
  for (let movedX = 0, movedZ = 0; movedX < spanX || movedZ < spanZ;) {
    // Anda no eixo cuja próxima borda de casa a reta cruza primeiro (conta inteira, sem divisão).
    if ((1 + 2 * movedX) * spanZ < (1 + 2 * movedZ) * spanX) {
      x += stepX;
      movedX += 1;
    } else {
      z += stepZ;
      movedZ += 1;
    }
    cells.push({ x, z });
  }
  return cells;
}
