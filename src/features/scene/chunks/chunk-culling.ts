/**
 * Quais pedaços a câmera vê, e com quanto detalhe. TypeScript puro: a cena converte o frustum
 * do three.js em planos simples e decide pedaço a pedaço, sem olhar casa por casa. Esconder um
 * pedaço inteiro (o grupo dele) poupa o three de visitar cada malha dele, na imagem e na sombra.
 */
import { pieceRect, stepsToWorld, type MapChunk } from '@/domain/map-v2';
import { FLOOR_BASE_DEPTH, MODEL_MAX_HEIGHT, type Box, type Vec3 } from '../layout';

/**
 * Folga em volta da caixa do pedaço: a espessura das paredes da borda e o modelo que passa um
 * pouco da casa. Melhor sobrar que um pedaço sumir com um pedaço de parede ainda na tela.
 */
const BOX_MARGIN = 1;
/** Altura que se reserva acima da base de cada peça (o pilar, a mais alta do catálogo, tem ~2,1). */
const PIECE_HEIGHT_ALLOWANCE = MODEL_MAX_HEIGHT + 1;

/** Caixa do mundo que contém tudo que o pedaço desenha, inclusive a peça que avança no vizinho. */
export function chunkWorldBox(chunk: MapChunk): Box {
  const { bounds, terrain } = chunk;
  let maxX = bounds.x + bounds.width;
  let maxZ = bounds.z + bounds.depth;
  let topSteps = 0;
  for (const height of terrain.heights) topSteps = Math.max(topSteps, height);
  let top = stepsToWorld(topSteps);
  for (const wall of chunk.walls) top = Math.max(top, stepsToWorld(wall.level + wall.height));
  for (const piece of chunk.pieces) {
    const rect = pieceRect(piece);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxZ = Math.max(maxZ, rect.z + rect.depth);
    top = Math.max(top, stepsToWorld(piece.level) + PIECE_HEIGHT_ALLOWANCE * piece.scale);
  }
  return {
    min: { x: bounds.x - BOX_MARGIN, y: -FLOOR_BASE_DEPTH, z: bounds.z - BOX_MARGIN },
    max: { x: maxX + BOX_MARGIN, y: top + BOX_MARGIN, z: maxZ + BOX_MARGIN },
  };
}

/** Plano do frustum na convenção do three: um ponto p está do lado de dentro se normal·p + constant ≥ 0. */
export type FrustumPlane = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly constant: number;
};

/**
 * A caixa toca o frustum? Para cada plano, testa só o canto da caixa mais "para dentro": se
 * nem ele passa, a caixa inteira está fora. Pode dizer "toca" para uma caixa perto de uma
 * quina do frustum que não toca (falso positivo barato), nunca o contrário.
 */
export function boxIntersectsFrustum(box: Box, planes: readonly FrustumPlane[]): boolean {
  for (const plane of planes) {
    const x = plane.x > 0 ? box.max.x : box.min.x;
    const y = plane.y > 0 ? box.max.y : box.min.y;
    const z = plane.z > 0 ? box.max.z : box.min.z;
    if (plane.x * x + plane.y * y + plane.z * z + plane.constant < 0) return false;
  }
  return true;
}

/** Distância do ponto à caixa (0 dentro dela). */
export function distanceToBox(point: Vec3, box: Box): number {
  const dx = Math.max(box.min.x - point.x, 0, point.x - box.max.x);
  const dy = Math.max(box.min.y - point.y, 0, point.y - box.max.y);
  const dz = Math.max(box.min.z - point.z, 0, point.z - box.max.z);
  return Math.hypot(dx, dy, dz);
}

/**
 * Quanto do pedaço desenhar: nada (fora da câmera ou depois da neblina), só o grosso (terreno
 * e paredes em blocos lisos, a silhueta da cidade) ou tudo (detalhado, com peças e grade).
 */
export type ChunkDetail = 'hidden' | 'coarse' | 'full';

export type ChunkView = {
  readonly planes: readonly FrustumPlane[];
  readonly eye: Vec3;
  /** Além disto nada aparece: é o fim da neblina, então esconder não muda a imagem. */
  readonly maxDistance: number;
  /** Até esta distância o pedaço sai completo; depois, só o grosso. Vem do nível de qualidade. */
  readonly detailDistance: number;
};

export function chunkDetail(box: Box, view: ChunkView): ChunkDetail {
  if (!boxIntersectsFrustum(box, view.planes)) return 'hidden';
  const distance = distanceToBox(view.eye, box);
  if (distance > view.maxDistance) return 'hidden';
  return distance > view.detailDistance ? 'coarse' : 'full';
}

/** Que grupos do pedaço aparecem neste quadro. */
export type ChunkLayers = { readonly root: boolean; readonly near: boolean; readonly far: boolean };

/**
 * Perto sai o desenho detalhado; enquanto ele ainda monta (um ou dois quadros), os blocos de
 * longe seguram o lugar, para o pedaço não sumir.
 */
export function chunkLayers(detail: ChunkDetail, nearReady: boolean): ChunkLayers {
  const near = detail === 'full' && nearReady;
  return {
    root: detail !== 'hidden',
    near,
    far: detail === 'coarse' || (detail === 'full' && !near),
  };
}
