/**
 * Corte de andares: esconde o que está acima de uma altura absoluta para ver o lado de dentro
 * dos prédios. Aqui ficam só as regras puras; o corte de cada pessoa fica no navegador dela e
 * a trava do mestre, na mesa (rooms.cutaway_lock).
 *
 * O TERRENO NUNCA É ESCONDIDO nem cortado, nem quando o corte fica abaixo de um morro: por
 * isso não há função de terreno neste arquivo. O corte só mexe em paredes e peças.
 */
import { MAX_LEVEL, MAX_WALL_HEIGHT_STEPS, STORY_HEIGHT_STEPS } from './constants';
import { stepsToStory, storyToSteps, wallTopLevel } from './height';
import type { MapPiece, MapWall } from './schema';
import type { MapModel } from './types';

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

/**
 * Andar mais alto em que alguma peça começa ou alguma parede chega (0 = só o térreo): é
 * até onde o controle de corte precisa ir. Custa o número de paredes e peças do mapa, nunca o de casas.
 */
export function topStory(model: MapModel): number {
  let highest = 0;
  for (const chunk of model.chunks.values()) {
    for (const piece of chunk.pieces) highest = Math.max(highest, piece.level);
    // Uma parede alta já é um prédio de vários andares, mesmo de base no chão.
    for (const wall of chunk.walls) highest = Math.max(highest, wallTopLevel(wall) - 1);
  }
  return stepsToStory(highest);
}

/**
 * Andar que o corte mostra (o mais alto que ainda aparece), ou null sem corte. Um corte fora
 * da divisa dos andares (só vem de uma trava gravada à mão) conta pelo andar que ele corta.
 */
export function storyShownByCutaway(cut: Cutaway): number | null {
  if (cut === null) return null;
  return Math.max(Math.ceil(cut / STORY_HEIGHT_STEPS) - 1, 0);
}

export type CutawayDirection = 'up' | 'down';

/**
 * Próximo corte do controle, andar por andar. Descer esconde mais um andar (até sobrar só o
 * térreo); subir mostra mais um, e passar do andar de baixo do mais alto do mapa tira o corte:
 * um corte acima de tudo não esconderia nada.
 */
export function stepCutaway(cut: Cutaway, direction: CutawayDirection, top: number): Cutaway {
  const highestCut = Math.max(top - 1, 0);
  const shown = storyShownByCutaway(cut);
  if (direction === 'down') {
    return cutawayShowingUpToStory(shown === null ? highestCut : Math.max(shown - 1, 0));
  }
  if (shown === null || shown + 1 > highestCut) return NO_CUTAWAY;
  return cutawayShowingUpToStory(shown + 1);
}
