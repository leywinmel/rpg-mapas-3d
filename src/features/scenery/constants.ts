/**
 * Tempos do cenário que o mestre move durante o jogo (RPG-27).
 */

/** Quanto a peça leva para deslizar do lugar antigo ao novo: rápido, mas dá para acompanhar. */
export const GLIDE_DURATION_MS = 600;

/**
 * Por quanto tempo o jogador mantém a peça no lugar novo antes de o banco confirmar. O mestre
 * grava ~1,2 s depois de soltar (AUTOSAVE_DELAY_MS) e a mesa relê em seguida; esta folga cobre
 * uma conexão lenta. Passado isso, vale o que o banco disser (o aviso pode ter sido falso).
 */
export const PENDING_MOVE_TTL_MS = 15_000;

/**
 * Mais peças que isto mudando de lugar numa mudança só não é "o mestre moveu um carro": é uma
 * edição em massa (desfazer uma casa inteira). Aí não há deslize, a mesa só relê o mapa.
 */
export const MAX_GLIDES_PER_CHANGE = 16;
