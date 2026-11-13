/**
 * Fundos temáticos (RPG-40): a paisagem em volta do mapa, no lugar da cor única. TypeScript puro
 * (sem three.js): o que cada fundo tem e onde cada peça cai. As peças são espalhadas com semente,
 * então o mesmo mapa mostra a mesma paisagem em todo navegador.
 */
import type { Backdrop, GridSize } from '@/domain';
import type { InstanceTransform } from '../layout';
import type { QualityLevel } from '../quality/quality';

/** Peças da paisagem. As do catálogo do mapa (árvore, rocha, pilar) são reaproveitadas. */
export type BackdropPiece =
  | 'arvore'
  | 'rocha'
  | 'pilar'
  | 'cacto'
  | 'duna'
  | 'estalagmite'
  | 'predio-baixo'
  | 'predio-medio'
  | 'predio-alto';

export type ScatterGroup = {
  piece: BackdropPiece;
  /** Peças por unidade de área do anel; o teto `max` segura o custo em mapa enorme. */
  perArea: number;
  max: number;
  /** Escala sorteada entre os dois valores (antes do fator do tamanho do mapa). */
  scale: readonly [number, number];
};

export type BackdropSpec = {
  /** Cor do chão em volta do mapa. */
  groundColor: string;
  /** Mar: lâmina de água animada por cima do chão. */
  water: boolean;
  /** Floresta: folhas caindo na beira do mapa. */
  leaves: boolean;
  groups: readonly ScatterGroup[];
};

export type SceneBackdrop = Exclude<Backdrop, 'none'>;

export const BACKDROP_LABELS: Readonly<Record<Backdrop, string>> = {
  none: 'Nenhum (cor lisa)',
  forest: 'Floresta',
  desert: 'Deserto',
  city: 'Cidade',
  dungeon: 'Masmorra',
  sea: 'Mar',
};

export const BACKDROP_SPECS: Readonly<Record<SceneBackdrop, BackdropSpec>> = {
  forest: {
    groundColor: '#1f2a17',
    water: false,
    leaves: true,
    groups: [
      { piece: 'arvore', perArea: 0.05, max: 900, scale: [1.6, 3.4] },
      { piece: 'rocha', perArea: 0.006, max: 120, scale: [0.8, 2] },
    ],
  },
  desert: {
    groundColor: '#8a6a41',
    water: false,
    leaves: false,
    groups: [
      { piece: 'duna', perArea: 0.005, max: 200, scale: [2.5, 6] },
      { piece: 'cacto', perArea: 0.006, max: 220, scale: [1.2, 2.4] },
      { piece: 'rocha', perArea: 0.004, max: 140, scale: [1, 2.6] },
    ],
  },
  city: {
    groundColor: '#26262c',
    water: false,
    leaves: false,
    groups: [
      { piece: 'predio-baixo', perArea: 0.006, max: 220, scale: [2, 3] },
      { piece: 'predio-medio', perArea: 0.005, max: 180, scale: [2, 3] },
      { piece: 'predio-alto', perArea: 0.003, max: 120, scale: [2, 3.2] },
    ],
  },
  dungeon: {
    groundColor: '#1d1a1f',
    water: false,
    leaves: false,
    groups: [
      { piece: 'pilar', perArea: 0.004, max: 140, scale: [1.6, 3] },
      { piece: 'estalagmite', perArea: 0.012, max: 360, scale: [1, 3.2] },
      { piece: 'rocha', perArea: 0.006, max: 160, scale: [1, 2.4] },
    ],
  },
  sea: {
    groundColor: '#14283a',
    water: true,
    leaves: false,
    groups: [{ piece: 'rocha', perArea: 0.003, max: 110, scale: [2.2, 4.2] }],
  },
};

/** Fração das peças desenhadas em cada nível de qualidade: PC fraco ganha paisagem mais rala. */
export const BACKDROP_DENSITY: Readonly<Record<QualityLevel, number>> = {
  high: 1,
  medium: 0.6,
  low: 0.35,
};

/** Folga entre a borda do mapa e a primeira peça: nada da paisagem encosta no tabuleiro. */
export const BACKDROP_MARGIN = 2;
/** Fundo do bloco do mapa é -0,3; o chão fica logo abaixo, como a mesa sob a maquete. */
export const BACKDROP_GROUND_Y = -0.32;
/**
 * Lâmina do mar: corta a lateral do bloco, e a crista da onda (0,18) fica abaixo do topo do
 * chão do mapa.
 */
export const BACKDROP_WATER_Y = -0.2;
/** Fundo do mar bem abaixo do vale da onda: sem isso o chão furava a água em manchas escuras. */
export const BACKDROP_SEABED_Y = -1.2;

/** Altura do chão da paisagem: o fundo do mar fica mais fundo que o chão seco. */
export function backdropGroundY(spec: BackdropSpec): number {
  return spec.water ? BACKDROP_SEABED_Y : BACKDROP_GROUND_Y;
}

/**
 * Profundidade do anel em volta do mapa. A neblina engole o que passa de ~1,2 lado do mapa
 * atrás dele; a sobra cobre os dias claros, em que a neblina vai mais longe.
 */
const RING_DEPTH_FACTOR = 1.6;
const RING_DEPTH_PADDING = 16;
/** Mapa grande é visto de longe: as peças crescem com ele, até 4 vezes. */
const SCALE_SPAN_REFERENCE = 48;
const MAX_SPAN_SCALE = 4;
/** Mais peças perto do mapa (onde a câmera vê) que no fundo (onde a neblina cobre). */
const NEAR_BIAS = 1.6;
const FULL_TURN_DEGREES = 360;

export type BackdropRing = {
  center: { x: number; z: number };
  /** Metade da largura e da profundidade do retângulo vazio (mapa + folga). */
  halfWidth: number;
  halfDepth: number;
  /** Quanto o anel avança para fora do retângulo vazio. */
  depth: number;
};

export function backdropRing(size: GridSize): BackdropRing {
  const span = Math.max(size.width, size.depth);
  return {
    center: { x: size.width / 2, z: size.depth / 2 },
    halfWidth: size.width / 2 + BACKDROP_MARGIN,
    halfDepth: size.depth / 2 + BACKDROP_MARGIN,
    depth: span * RING_DEPTH_FACTOR + RING_DEPTH_PADDING,
  };
}

/** Raio do disco de chão: cobre o anel inteiro, cantos inclusive. */
export function groundRadius(ring: BackdropRing): number {
  return Math.hypot(ring.halfWidth, ring.halfDepth) + ring.depth;
}

function ringArea(ring: BackdropRing): number {
  const outerWidth = 2 * (ring.halfWidth + ring.depth);
  const outerDepth = 2 * (ring.halfDepth + ring.depth);
  return outerWidth * outerDepth - 4 * ring.halfWidth * ring.halfDepth;
}

/** Gerador com semente (mulberry32): mesma paisagem para o mesmo mapa. */
function seededRandom(seedText: string): () => number {
  let seed = 0;
  for (const char of seedText) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ponto do anel: sorteia uma direção, anda do centro até a borda do retângulo vazio e segue
 * mais um pouco para fora. Fica sempre fora do mapa, sem precisar sortear de novo.
 */
export function ringPoint(ring: BackdropRing, random: () => number): { x: number; z: number } {
  const angle = random() * Math.PI * 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const toEdge = Math.min(
    cos === 0 ? Infinity : ring.halfWidth / Math.abs(cos),
    sin === 0 ? Infinity : ring.halfDepth / Math.abs(sin),
  );
  const out = ring.depth * random() ** NEAR_BIAS;
  return { x: ring.center.x + cos * (toEdge + out), z: ring.center.z + sin * (toEdge + out) };
}

export type ScatteredGroup = { piece: BackdropPiece; transforms: InstanceTransform[] };

export type ScatterOptions = { level?: QualityLevel };

/** Onde cai cada peça da paisagem, agrupada por peça (um InstancedMesh por grupo). */
export function scatterBackdrop(
  backdrop: SceneBackdrop,
  size: GridSize,
  { level = 'high' }: ScatterOptions = {},
): ScatteredGroup[] {
  const ring = backdropRing(size);
  const area = ringArea(ring);
  const span = Math.max(size.width, size.depth);
  const spanScale = Math.min(Math.max(span / SCALE_SPAN_REFERENCE, 1), MAX_SPAN_SCALE);
  const spec = BACKDROP_SPECS[backdrop];
  const groundY = backdropGroundY(spec);
  return spec.groups.map((group) => {
    const random = seededRandom(`${backdrop}:${group.piece}:${size.width}x${size.depth}`);
    const count = Math.round(Math.min(area * group.perArea, group.max) * BACKDROP_DENSITY[level]);
    const [minScale, maxScale] = group.scale;
    const transforms: InstanceTransform[] = [];
    for (let index = 0; index < count; index += 1) {
      const point = ringPoint(ring, random);
      transforms.push({
        x: point.x,
        y: groundY,
        z: point.z,
        rotationY: random() * FULL_TURN_DEGREES,
        scale: (minScale + random() * (maxScale - minScale)) * spanScale,
      });
    }
    return { piece: group.piece, transforms };
  });
}
