/**
 * Corte de andares: esconde o que está acima de uma altura absoluta para ver o lado de dentro
 * dos prédios. Aqui ficam só as regras puras; quem guarda o estado do corte de cada jogador e
 * a trava do mestre é outra fatia.
 *
 * O TERRENO NUNCA É ESCONDIDO nem cortado, nem quando o corte fica abaixo de um morro: por
 * isso não há função de terreno neste arquivo. O corte só mexe em paredes e peças.
 */
import { MAX_LEVEL, MAX_WALL_HEIGHT_STEPS } from './constants';
import { storyToSteps } from './height';
import type { MapPiece, MapWall } from './schema';

/**
 * Altura do corte em degraus absolutos: tudo que começa nela ou acima fica escondido.
 * null = sem corte. Vai e volta por JSON (presença e banco), o que Infinity não faria.
 */
export type Cutaway = number | null;

export const NO_CUTAWAY: Cutaway = null;

/** Acima disto o corte não esconde mais nada: passa do topo da parede mais alta possível. */
export const MAX_CUTAWAY = MAX_LEVEL + MAX_WALL_HEIGHT_STEPS;

export function isValidCutaway(value: unknown): value is Cutaway {
  if (value === null) return true;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_CUTAWAY;
}

/** Corte que mostra o andar `story` e os de baixo, e esconde os de cima (o andar 0 é o térreo). */
export function cutawayShowingUpToStory(story: number): Cutaway {
  return storyToSteps(story + 1);
}

/**
 * A peça aparece? Uma peça é um modelo 3D inteiro, que não dá para serrar no meio: aparece
 * enquanto a base está abaixo do corte, mesmo que o topo passe dele.
 */
export function isPieceVisible(piece: Pick<MapPiece, 'level'>, cut: Cutaway): boolean {
  return cut === null || piece.level < cut;
}

/**
 * Altura da parede que aparece, em degraus: a inteira sem corte ou com o corte acima do topo;
 * só a parte de baixo quando o corte passa no meio dela; 0 quando ela começa no corte ou acima.
 */
export function visibleWallHeight(wall: Pick<MapWall, 'level' | 'height'>, cut: Cutaway): number {
  if (cut === null) return wall.height;
  return Math.min(wall.height, Math.max(cut - wall.level, 0));
}

export type CutawayChoice = {
  /** O corte que a pessoa escolheu para si. */
  readonly own: Cutaway;
  /** O corte em que o mestre travou a mesa; null = mesa livre. */
  readonly locked: Cutaway;
  readonly isMaster: boolean;
};

/**
 * O corte que vale para quem está olhando. O mestre vê o que escolheu, a trava não o alcança.
 * Para o jogador, com a mesa travada vale o menor entre o dele e o travado (o que esconde
 * mais), e quem não escolheu corte nenhum fica no travado; com a mesa livre vale o dele.
 */
export function effectiveCutaway({ own, locked, isMaster }: CutawayChoice): Cutaway {
  if (isMaster || locked === null) return own;
  return own === null ? locked : Math.min(own, locked);
}
