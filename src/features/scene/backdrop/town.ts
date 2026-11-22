/**
 * Bairro do fundo "Cidade moderna": em vez de prédios soltos, uma cidade pequena em grade, com
 * ruas de asfalto, quadras de calçada e gramado e casas térreas e sobrados de frente para a rua.
 * TypeScript puro (sem three.js), com semente: o mesmo mapa mostra o mesmo bairro em todo navegador.
 */
import type { InstanceTransform } from '../layout';
import type { BackdropPiece, BackdropRing } from './backdrop';

/** Medidas do bairro em casas do mapa, antes do fator do tamanho do mapa. */
export const TOWN = {
  /** Lote de cada casa (quadrado). */
  lot: 3,
  /** Lotes por quadra: quatro de frente e dois de fundo (uma fileira para cada rua). */
  lotsAcross: 4,
  lotsDeep: 2,
  sidewalk: 0.5,
  road: 2,
  /** Teto de casas perto do mapa; o resto do anel fica com a neblina. */
  maxHouses: 700,
  /** Lote sem casa vira quintal com árvore, para o bairro não ficar um carimbo só. */
  treeChance: 0.14,
} as const;

/** Casas do bairro e o peso de cada uma no sorteio. */
const HOUSES: ReadonlyArray<{ piece: BackdropPiece; weight: number }> = [
  { piece: 'casa', weight: 0.45 },
  { piece: 'casa-clara', weight: 0.3 },
  { piece: 'sobrado', weight: 0.25 },
];
const HOUSE_SCALE: readonly [number, number] = [1.9, 2.3];
const TREE_SCALE: readonly [number, number] = [1.3, 2];
const HALF_TURN_DEGREES = 180;

/** Retângulo no chão do mundo, pelo canto de menor x e z. */
export type TownRect = { x: number; z: number; width: number; depth: number };

export type TownLayout = {
  houses: ReadonlyArray<{ piece: BackdropPiece; transforms: InstanceTransform[] }>;
  /** Quadras inteiras (calçada); o gramado é a quadra recuada pela calçada. */
  blocks: TownRect[];
  roads: TownRect[];
  /** Medida da calçada já no tamanho do mapa, para quem desenha o gramado. */
  sidewalk: number;
};

type Lot = { x: number; z: number; facesSouth: boolean; distance: number; block: number };

/** Distância de um ponto até o retângulo vazio em volta do mapa (0 dentro dele). */
function distanceToHole(ring: BackdropRing, x: number, z: number): number {
  const dx = Math.max(Math.abs(x - ring.center.x) - ring.halfWidth, 0);
  const dz = Math.max(Math.abs(z - ring.center.z) - ring.halfDepth, 0);
  return Math.hypot(dx, dz);
}

/** O lote encosta no retângulo vazio: casa ali furaria o tabuleiro. */
function touchesHole(ring: BackdropRing, x: number, z: number, half: number): boolean {
  return (
    Math.abs(x - ring.center.x) < ring.halfWidth + half &&
    Math.abs(z - ring.center.z) < ring.halfDepth + half
  );
}

function pickHouse(roll: number): BackdropPiece {
  let total = 0;
  for (const house of HOUSES) {
    total += house.weight;
    if (roll < total) return house.piece;
  }
  return HOUSES[HOUSES.length - 1]!.piece;
}

type TownOptions = {
  ring: BackdropRing;
  scale: number;
  groundY: number;
  density: number;
  random: () => number;
};

/**
 * Monta o bairro: a grade de quadras nasce centrada no mapa (as de baixo dele ficam escondidas
 * pelo tabuleiro), as casas ocupam os lotes mais perto do mapa até o teto, e só as quadras que
 * ganharam casa entram, com as ruas cobrindo a área delas.
 */
export function layTown({ ring, scale, groundY, density, random }: TownOptions): TownLayout {
  const lot = TOWN.lot * scale;
  const sidewalk = TOWN.sidewalk * scale;
  const blockWidth = TOWN.lotsAcross * lot + 2 * sidewalk;
  const blockDepth = TOWN.lotsDeep * lot + 2 * sidewalk;
  const stepX = blockWidth + TOWN.road * scale;
  const stepZ = blockDepth + TOWN.road * scale;
  const reachX = ring.halfWidth + ring.depth;
  const reachZ = ring.halfDepth + ring.depth;
  const columns = Math.ceil(reachX / stepX);
  const rows = Math.ceil(reachZ / stepZ);
  const originX = ring.center.x - blockWidth / 2;
  const originZ = ring.center.z - blockDepth / 2;

  const allBlocks: TownRect[] = [];
  const lots: Lot[] = [];
  for (let row = -rows; row <= rows; row += 1) {
    for (let column = -columns; column <= columns; column += 1) {
      const block: TownRect = {
        x: originX + column * stepX,
        z: originZ + row * stepZ,
        width: blockWidth,
        depth: blockDepth,
      };
      const index = allBlocks.push(block) - 1;
      for (let deep = 0; deep < TOWN.lotsDeep; deep += 1) {
        for (let across = 0; across < TOWN.lotsAcross; across += 1) {
          const x = block.x + sidewalk + (across + 0.5) * lot;
          const z = block.z + sidewalk + (deep + 0.5) * lot;
          if (touchesHole(ring, x, z, lot / 2)) continue;
          const distance = distanceToHole(ring, x, z);
          if (distance > ring.depth) continue;
          lots.push({ x, z, facesSouth: deep === TOWN.lotsDeep - 1, distance, block: index });
        }
      }
    }
  }
  lots.sort((a, b) => a.distance - b.distance);
  const kept = lots.slice(0, Math.round(TOWN.maxHouses * density));

  const byPiece = new Map<BackdropPiece, InstanceTransform[]>();
  const usedBlocks = new Set<number>();
  for (const item of kept) {
    usedBlocks.add(item.block);
    const tree = random() < TOWN.treeChance;
    const piece = tree ? 'arvore' : pickHouse(random());
    const [min, max] = tree ? TREE_SCALE : HOUSE_SCALE;
    const transforms = byPiece.get(piece) ?? [];
    byPiece.set(piece, transforms);
    transforms.push({
      x: item.x,
      y: groundY,
      z: item.z,
      // A frente do modelo olha para +z: a fileira de trás dá as costas e olha para a outra rua.
      rotationY: item.facesSouth ? 0 : HALF_TURN_DEGREES,
      scale: (min + random() * (max - min)) * scale,
    });
  }

  const blocks = allBlocks.filter((_, index) => usedBlocks.has(index));
  return {
    houses: [...byPiece].map(([piece, transforms]) => ({ piece, transforms })),
    blocks,
    roads: blocks.length === 0 ? [] : [pavementUnder(blocks, TOWN.road * scale)],
    sidewalk,
  };
}

/** Um asfalto só debaixo das quadras usadas: as ruas são o que sobra entre uma quadra e outra. */
function pavementUnder(blocks: readonly TownRect[], road: number): TownRect {
  const minX = Math.min(...blocks.map((block) => block.x)) - road;
  const minZ = Math.min(...blocks.map((block) => block.z)) - road;
  const maxX = Math.max(...blocks.map((block) => block.x + block.width)) + road;
  const maxZ = Math.max(...blocks.map((block) => block.z + block.depth)) + road;
  return { x: minX, z: minZ, width: maxX - minX, depth: maxZ - minZ };
}
