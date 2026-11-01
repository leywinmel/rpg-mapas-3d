/**
 * Números da bandeja e da simulação. Quem rola e quem assiste rodam a mesma
 * simulação com a mesma entrada, então qualquer mudança aqui muda o resultado de
 * todos ao mesmo tempo: a mesa inteira precisa estar na mesma versão do app.
 */

/** Passo fixo da simulação (60 quadros por segundo), sem depender do relógio. */
export const STEPS_PER_SECOND = 60;
export const STEP_SECONDS = 1 / STEPS_PER_SECOND;

/** Se os dados não assentarem até aqui, a simulação para e lê o que houver (~6 s). */
export const MAX_SIMULATION_SECONDS = 6;
export const MAX_SIMULATION_STEPS = MAX_SIMULATION_SECONDS * STEPS_PER_SECOND;

/** Os dados precisam ficar parados por este tempo seguido para valer como "assentados". */
export const REST_SECONDS = 0.25;
export const REST_STEPS = Math.round(REST_SECONDS * STEPS_PER_SECOND);
/** Velocidades abaixo destas contam como parado (unidades por segundo e radianos por segundo). */
export const REST_LINEAR_SPEED = 0.08;
export const REST_ANGULAR_SPEED = 0.15;

/** Floats por dado em cada quadro gravado: x, y, z e a rotação (x, y, z, w). */
export const FLOATS_PER_BODY = 7;

// ---------------------------------------------------------------- Bandeja
/** Metade da largura (x) e da profundidade (z) do piso onde os dados rolam. */
export const TRAY_HALF_WIDTH = 6;
export const TRAY_HALF_DEPTH = 4;
/** As paredes de colisão são altas para nenhum dado escapar; a borda desenhada é mais baixa. */
export const TRAY_WALL_HEIGHT = 18;
export const TRAY_WALL_THICKNESS = 1;
export const TRAY_CEILING_HEIGHT = 16;
export const TRAY_RIM_HEIGHT = 0.7;

// ------------------------------------------------------------------ Física
export const GRAVITY = 45;
export const FLOOR_FRICTION = 0.55;
export const FLOOR_RESTITUTION = 0.25;
export const WALL_FRICTION = 0.3;
export const WALL_RESTITUTION = 0.45;
export const DIE_FRICTION = 0.5;
export const DIE_RESTITUTION = 0.3;
export const DIE_DENSITY = 1;
export const DIE_LINEAR_DAMPING = 0.08;
export const DIE_ANGULAR_DAMPING = 0.25;

/** Acima deste desvio (graus) o dado está apoiado torto (numa parede ou em outro dado). */
export const MAX_REST_TILT_DEGREES = 6;
/** Tentativas de um arremesso que termine com todos os dados assentados e retos. */
export const MAX_THROW_ATTEMPTS = 8;

// ---------------------------------------------------------- Arremesso (spec)
/** Casas decimais dos números enviados à mesa: curto na rede e igual para todos. */
export const SPEC_DECIMALS = 3;

/** Onde os dados nascem: perto da borda de frente, espalhados em colunas, em camadas. */
export const SPAWN_COLUMNS = 6;
export const SPAWN_ROWS = 2;
export const SPAWN_SPACING = 1.75;
export const SPAWN_FRONT_MARGIN = 1.1;
export const SPAWN_BASE_HEIGHT = 2.6;
export const SPAWN_LAYER_HEIGHT = 1.7;
export const SPAWN_JITTER = 0.18;

export const THROW_SPEED_MIN = 5;
export const THROW_SPEED_MAX = 10;
export const THROW_SIDEWAYS_SPEED = 1.6;
/** Quanto da distância até o meio da bandeja vira empurrão lateral (por segundo). */
export const THROW_CENTERING_FACTOR = 0.25;
export const THROW_LIFT_MIN = -1;
export const THROW_LIFT_MAX = 2.5;
export const SPIN_MIN = 8;
export const SPIN_MAX = 22;

/** Limites aceitos de um arremesso recebido pela rede (maiores que os de quem gera). */
export const LIMIT_POSITION_HEIGHT = 24;
export const LIMIT_LINEAR_SPEED = 40;
export const LIMIT_ANGULAR_SPEED = 80;

/**
 * Dados menores quando há muitos, para caberem na bandeja. Depende só da quantidade,
 * então todos calculam o mesmo.
 */
export const DIE_SCALE_BY_COUNT: ReadonlyArray<{ readonly upTo: number; readonly scale: number }> =
  [
    { upTo: 6, scale: 1 },
    { upTo: 14, scale: 0.85 },
    { upTo: 30, scale: 0.7 },
    { upTo: Number.POSITIVE_INFINITY, scale: 0.58 },
  ];

export function scaleForDiceCount(count: number): number {
  const band = DIE_SCALE_BY_COUNT.find((candidate) => count <= candidate.upTo);
  return band ? band.scale : 1;
}
