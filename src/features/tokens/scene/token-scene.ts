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
  figureHeight: 0.85,
  labelGap: 0.25,
  selectionInner: 0.43,
  selectionOuter: 0.5,
} as const;

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
