import type { Cell } from '@/domain';
import { stepsToWorld } from '@/domain/map-v2';

/**
 * Medidas e cores dos tokens na cena. Como a paleta da cena, as cores não seguem o tema da
 * interface: o token tem a mesma cara no claro e no escuro.
 */
export const TOKEN_SCENE_COLORS = {
  base: '#24212b',
  baseEdge: '#4a4555',
  card: '#d8cfbf',
  skin: '#c9a184',
  eyes: '#ffd27a',
  selection: '#ffd27a',
  hiddenTint: '#8d82b0',
  /** Caixa no lugar do modelo enviado que foi apagado ou não abriu. */
  missingModel: '#5a5366',
} as const;

/** Medidas de um token 1×1; os maiores crescem na proporção do lado. */
export const TOKEN_SHAPE = {
  baseRadius: 0.4,
  baseHeight: 0.06,
  cardWidth: 0.62,
  cardHeight: 0.9,
  cardThickness: 0.02,
  /**
   * Altura do boneco 3D: gente de verdade na escala do mapa (uma casa tem cerca de 1,1 m), menor
   * que a porta (2 casas) e do tamanho dos carros.
   */
  figureHeight: 1.5,
  labelGap: 0.25,
  selectionInner: 0.43,
  selectionOuter: 0.5,
} as const;

/** Altura do boneco de primitivas como foi desenhado; ele cresce inteiro até `figureHeight`. */
export const PRIMITIVE_FIGURE_HEIGHT = 0.85;

/** Topo do token mais alto (boneco ou cartão), para pôr o nome logo acima. */
export const TOKEN_TOP = Math.max(TOKEN_SHAPE.cardHeight, TOKEN_SHAPE.figureHeight);

/** Token escondido aparece meio apagado para o mestre (o jogador nem recebe a linha). */
export const HIDDEN_TOKEN_OPACITY = 0.45;

/** Quanto da distância até a casa nova o token anda por segundo (suaviza o arraste dos outros). */
export const TOKEN_GLIDE_PER_SECOND = 14;

/** Arrasto menor que isto (px) ainda é clique de seleção. */
export const TOKEN_CLICK_TOLERANCE_PX = 4;

/** Ponto do mundo onde fica o centro da base do token. */
export function tokenWorldPosition(anchor: Cell, size: number, level: number) {
  return { x: anchor.x + size / 2, y: stepsToWorld(level), z: anchor.z + size / 2 };
}

/** Lado máximo do modelo enviado no chão, em casas: cabe na casa do token sem invadir a vizinha. */
export const UPLOADED_MODEL_FOOTPRINT = 0.95;

type Point3 = { readonly x: number; readonly y: number; readonly z: number };
export type ModelBounds = { readonly min: Point3; readonly max: Point3 };
export type ModelFit = { scale: number; position: [number, number, number] };

/**
 * Encaixa um modelo .glb qualquer no token: cada arquivo vem numa escala e com a origem num
 * lugar. A altura vira a de um boneco e a largura cabe na casa (o que apertar mais vale), e os
 * pés ficam em cima da base, no centro.
 */
export function fitUploadedModel(bounds: ModelBounds): ModelFit {
  const height = bounds.max.y - bounds.min.y;
  const width = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z);
  const limits = [
    height > 0 ? TOKEN_SHAPE.figureHeight / height : Infinity,
    width > 0 ? UPLOADED_MODEL_FOOTPRINT / width : Infinity,
  ];
  const fitted = Math.min(...limits);
  const scale = Number.isFinite(fitted) ? fitted : 1;
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerZ = (bounds.min.z + bounds.max.z) / 2;
  return {
    scale,
    position: [-centerX * scale, TOKEN_SHAPE.baseHeight - bounds.min.y * scale, -centerZ * scale],
  };
}

/** Quanto do giro que falta o token faz por segundo ao mudar de rumo. */
export const TOKEN_TURN_PER_SECOND = 10;

/** Abaixo desta distância (em casas) até o destino o rumo fica como está: o token não treme ao chegar. */
export const TOKEN_TURN_MIN_DISTANCE = 0.05;

/**
 * Giro em y de quem anda na direção (dx, dz). Zero olha para o sul (+z), a frente do token
 * parado. Nulo quando o passo é curto demais para dizer um rumo.
 */
export function headingOf(dx: number, dz: number): number | null {
  if (Math.hypot(dx, dz) < TOKEN_TURN_MIN_DISTANCE) return null;
  return Math.atan2(dx, dz);
}

/** Vira `step` (0 a 1) do caminho de `current` até `target` pelo lado mais curto do círculo. */
export function turnToward(current: number, target: number, step: number): number {
  const full = Math.PI * 2;
  const gap = ((((target - current) % full) + full * 1.5) % full) - Math.PI;
  return current + gap * step;
}

/** Fatia de baixo do modelo, onde ficam os pés, em fração da altura. */
const FEET_SLICE = 0.06;
/** Os pés precisam sair do centro ao menos isto (fração da profundidade) para dizer onde é a frente. */
const FEET_MIN_OFFSET = 0.02;

/**
 * Giro que põe de frente para o sul (+z) um modelo enviado. Cada programa exporta a frente para
 * um lado; os dedos dos pés apontam para a frente, então a ponta dos pés diz o lado. Sem pés
 * claros (bicho redondo, objeto), o modelo fica como veio.
 */
export function uploadedModelFacing(points: readonly Point3[]): number {
  if (points.length === 0) return 0;
  const ys = points.map((point) => point.y);
  const zs = points.map((point) => point.z);
  const minY = Math.min(...ys);
  const height = Math.max(...ys) - minY;
  const minZ = Math.min(...zs);
  const depth = Math.max(...zs) - minZ;
  if (height <= 0 || depth <= 0) return 0;
  const feet = points.filter((point) => point.y <= minY + height * FEET_SLICE);
  const feetZ = feet.reduce((sum, point) => sum + point.z, 0) / feet.length;
  const offset = (feetZ - (minZ + depth / 2)) / depth;
  return offset < -FEET_MIN_OFFSET ? Math.PI : 0;
}

/**
 * Chave dos extras da cena do .glb em que o próprio arquivo diz para onde olha ("+z", "-z",
 * "+x" ou "-x"). Bicho de tentáculos ou galhos não tem pés que digam a frente: quem prepara o
 * modelo (scripts/assets/clean-model.mjs --front) marca, e o app confia na marca.
 */
export const MODEL_FRONT_KEY = 'rpgmapsFront';

/** Giro em y que leva cada frente marcada para o sul (+z). */
const FRONT_TURNS: Readonly<Record<string, number>> = {
  '+z': 0,
  '-z': Math.PI,
  '+x': -Math.PI / 2,
  '-x': Math.PI / 2,
};

/** Giro da frente que o arquivo declara; nulo se ele não declara (ou declara algo estranho). */
export function declaredModelFacing(extras: Readonly<Record<string, unknown>>): number | null {
  const front = extras[MODEL_FRONT_KEY];
  if (typeof front !== 'string') return null;
  return FRONT_TURNS[front] ?? null;
}
