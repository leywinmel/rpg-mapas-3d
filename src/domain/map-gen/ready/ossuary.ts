/**
 * Catacumbas do Ossário (RPG-90, pedido do usuário em 26/11: "mais mapas, versões maiores"): uma
 * masmorra gigante num mapa 104×88. A escadaria desce da superfície até a capela dos ossos, com as
 * fileiras de pilares, os sarcófagos e o altar. A oeste, as galerias do ossário com as estantes
 * cheias de crânios; a leste, os túmulos dos nobres com as estátuas e o ouro da família. Ao sul,
 * o salão das armadilhas reparte o caminho: os aposentos dos sacerdotes (sudoeste), a cripta do
 * tesouro (sudeste) e, no fundo, o covil do lich, entre dois lagos negros.
 *
 * As peças vêm do pacote KayKit Dungeon Remastered (CC0) e das peças genéricas de masmorra.
 */
import type { Cell } from '../../grid';
import {
  createDefaultHeader,
  rectCells,
  rotatedFootprint,
  STORY_HEIGHT_STEPS,
  type CellRect,
} from '../../map-v2';
import type { AssembledMap } from '../assemble';
import { propFootprint } from '../kits';
import { createPlacer } from './placer';
import { createSketch, outlineWalls, type Sketch } from './sketch';

export const OSSUARY_SIZE = { width: 104, depth: 88 } as const;

const TILE = { stone: 'piso-pedra', dirt: 'terra', water: 'agua' } as const;
const WALL_STYLE = 'parede-pedra';
const PIECE = {
  stairs: 'kay-escada-pedra',
  pillar: 'kay-pilar-simples',
  ornatePillar: 'kay-pilar-ornado',
  statue: 'estatua',
  altar: 'mas-altar',
  sarcophagus: 'mas-sarcofago',
  bones: 'mas-ossos',
  skull: 'kay-cranio',
  boneShelves: 'kay-parede-estantes',
  candelabrum: 'kay-candelabro',
  candle: 'kay-vela-acesa',
  oldCandle: 'kay-vela-gasta',
  torch: 'tocha',
  banner: 'kay-estandarte-vermelho',
  tripleBanner: 'kay-estandarte-triplo',
  spikes: 'kay-armadilha-chao',
  grate: 'kay-grade-chao',
  openGrate: 'kay-grade-aberta',
  rubble: 'kay-entulho',
  smallRubble: 'kay-entulho-pequeno',
  bedFrame: 'kay-cama-estrado',
  strawBed: 'kay-cama-palha',
  brokenTable: 'kay-mesa-media-quebrada',
  chair: 'kay-cadeira-masmorra',
  keg: 'kay-barril-torneira',
  bottle: 'kay-garrafa-verde',
  plates: 'kay-pilha-pratos',
  meal: 'kay-prato-comida',
  shelves: 'kay-estante',
  ironChest: 'kay-bau-medio',
  smallChest: 'kay-bauzinho',
  trunk: 'kay-arca',
  goldChest: 'kay-bau-ouro',
  coins: 'kay-moedas',
  coinPile: 'kay-pilha-moedas',
  fewCoins: 'kay-moedinhas',
  goldArms: 'kay-espada-escudo-ouro',
  arms: 'kay-espada-escudo',
  key: 'kay-chave',
  fancyCrate: 'kay-caixinha-ornada',
  grave: 'kay-cova-terra',
  mushrooms: 'nat-cogumelos',
  rock: 'rocha',
} as const;

/** As salas e os corredores; os corredores encostam nas salas e o muro só sobe na borda. */
const ROOMS = {
  entrance: { x: 46, z: 2, width: 12, depth: 10 },
  northCorridor: { x: 50, z: 12, width: 4, depth: 6 },
  chapel: { x: 36, z: 18, width: 32, depth: 18 },
  westCorridor: { x: 24, z: 25, width: 12, depth: 4 },
  ossuary: { x: 4, z: 10, width: 20, depth: 34 },
  eastCorridor: { x: 68, z: 25, width: 12, depth: 4 },
  tombs: { x: 80, z: 10, width: 20, depth: 34 },
  chapelCorridor: { x: 50, z: 36, width: 4, depth: 8 },
  trapHall: { x: 40, z: 44, width: 24, depth: 10 },
  priestsCorridor: { x: 30, z: 47, width: 10, depth: 4 },
  priests: { x: 8, z: 50, width: 22, depth: 14 },
  vaultCorridor: { x: 64, z: 47, width: 10, depth: 4 },
  vault: { x: 74, z: 50, width: 22, depth: 14 },
  lairCorridor: { x: 50, z: 54, width: 4, depth: 12 },
  lair: { x: 28, z: 66, width: 48, depth: 18 },
} as const satisfies Record<string, CellRect>;
/** Os dois lagos negros do covil. */
const POOLS: readonly CellRect[] = [
  { x: 32, z: 70, width: 12, depth: 10 },
  { x: 62, z: 70, width: 12, depth: 10 },
];

const at = (x: number, z: number): Cell => ({ x, z });
const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
/** Só a pedra fica de pé dentro do lago. */
const AFLOAT = new Set<string>([PIECE.rock]);

/** O chão de pedra em tudo, terra batida nos aposentos e a água dos lagos. */
function carve(sketch: Sketch): Cell[] {
  const area: Cell[] = [];
  for (const [name, rect] of Object.entries(ROOMS)) {
    sketch.ground(rect, name === 'priests' ? TILE.dirt : TILE.stone);
    area.push(...rectCells(rect));
  }
  for (const pool of POOLS) sketch.ground(pool, TILE.water);
  return area;
}

export function buildOssuaryMap(): AssembledMap {
  const sketch = createSketch(OSSUARY_SIZE, null);
  const area = carve(sketch);
  outlineWalls(sketch, area, () => [{ style: WALL_STYLE, level: 0, height: STORY_HEIGHT_STEPS }]);
  const carved = new Set(area.map((cell) => `${cell.x},${cell.z}`));
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa: nada atravessa o muro nem cai no lago.
  const place = (piece: string, cells: readonly Cell[], rotation = 0) => {
    for (const cell of cells) {
      const size = rotatedFootprint(propFootprint(piece), rotation);
      for (let dz = 0; dz < size.depth; dz += 1) {
        for (let dx = 0; dx < size.width; dx += 1) {
          const spot = at(cell.x + dx, cell.z + dz);
          if (!carved.has(`${spot.x},${spot.z}`))
            throw new Error(`${piece} dentro da rocha em ${spot.x},${spot.z}.`);
          if (POOLS.some((pool) => inside(spot, pool)) !== AFLOAT.has(piece))
            throw new Error(`${piece} fora do lugar (água?) em ${spot.x},${spot.z}.`);
        }
      }
      placer(piece, cell, rotation);
    }
  };

  // A entrada: a escadaria que desce da superfície, o entulho e as tochas.
  place(PIECE.stairs, [at(50, 3)]);
  place(PIECE.smallRubble, [at(54, 8)]);
  place(PIECE.skull, [at(47, 8)]);
  place(PIECE.torch, [at(46, 2), at(57, 2), at(46, 11), at(57, 11)]);
  // A capela dos ossos: pilares, o altar com os candelabros, as estátuas e os sarcófagos.
  for (const x of [40, 46, 58, 64]) place(PIECE.pillar, [at(x, 22), at(x, 31)]);
  place(PIECE.altar, [at(51, 19)]);
  place(PIECE.candelabrum, [at(49, 19), at(54, 19)]);
  place(PIECE.candle, [at(50, 21), at(53, 21)]);
  place(PIECE.statue, [at(37, 19), at(66, 19)]);
  place(PIECE.banner, [at(42, 18), at(61, 18)]);
  place(PIECE.sarcophagus, [at(44, 25), at(48, 25), at(55, 25), at(59, 25)]);
  place(PIECE.bones, [at(38, 33), at(65, 33), at(44, 28)]);
  place(PIECE.torch, [at(36, 20), at(67, 20), at(36, 33), at(67, 33)]);
  // As galerias do ossário: fileiras de estantes cheias de crânios, ossos e velas gastas.
  place(PIECE.boneShelves, [at(5, 10), at(9, 10), at(13, 10), at(17, 10)]);
  for (const z of [18, 28, 36]) {
    place(PIECE.boneShelves, [at(6, z), at(10, z), at(14, z)]);
    place(PIECE.boneShelves, [at(6, z + 1), at(10, z + 1), at(14, z + 1)], 2);
  }
  place(PIECE.skull, [at(21, 12), at(5, 24), at(20, 33), at(12, 41)]);
  place(PIECE.bones, [at(8, 23), at(18, 24), at(14, 32), at(6, 40)]);
  place(PIECE.oldCandle, [at(4, 11), at(21, 17)]);
  place(PIECE.candle, [at(22, 20), at(22, 35)]);
  place(PIECE.mushrooms, [at(4, 43), at(23, 43)]);
  place(PIECE.torch, [at(23, 11), at(23, 42)]);
  // Os túmulos dos nobres: quatro fileiras de sarcófagos, as estátuas e o ouro da família.
  for (const x of [83, 87, 91, 95]) {
    place(PIECE.sarcophagus, [at(x, 13), at(x, 19), at(x, 33), at(x, 39)]);
  }
  place(PIECE.statue, [at(84, 24), at(84, 29), at(95, 24), at(95, 29)]);
  place(PIECE.goldChest, [at(98, 26)]);
  place(PIECE.coins, [at(98, 28)]);
  place(PIECE.fewCoins, [at(97, 27)]);
  place(PIECE.tripleBanner, [at(89, 10)]);
  place(PIECE.banner, [at(85, 43), at(94, 43)]);
  place(PIECE.candle, [at(85, 14), at(93, 14), at(85, 40), at(93, 40)]);
  place(PIECE.torch, [at(80, 11), at(99, 11), at(80, 42), at(99, 42)]);
  // O salão das armadilhas: espetos, grades no chão e o entulho de um desabamento.
  place(PIECE.spikes, [at(44, 46), at(57, 46)]);
  place(PIECE.openGrate, [at(50, 49)]);
  place(PIECE.grate, [at(44, 50), at(57, 50)]);
  place(PIECE.smallRubble, [at(60, 52)]);
  place(PIECE.skull, [at(41, 45), at(62, 45)]);
  place(PIECE.torch, [at(40, 44), at(63, 44)]);
  // Os aposentos dos sacerdotes: camas, a mesa quebrada, o barril e a despensa.
  place(PIECE.bedFrame, [at(9, 51), at(11, 51), at(13, 51)]);
  place(PIECE.strawBed, [at(15, 51), at(17, 51)]);
  place(PIECE.brokenTable, [at(20, 56)]);
  place(PIECE.chair, [at(19, 56), at(22, 57)]);
  place(PIECE.plates, [at(21, 52)]);
  place(PIECE.meal, [at(23, 52)]);
  place(PIECE.keg, [at(9, 62), at(11, 62)]);
  place(PIECE.bottle, [at(12, 62)]);
  place(PIECE.shelves, [at(27, 51)]);
  place(PIECE.boneShelves, [at(24, 63)]);
  place(PIECE.candle, [at(28, 62)]);
  place(PIECE.torch, [at(8, 57), at(29, 57)]);
  // A cripta do tesouro: baús, arcas, moedas, as armas douradas e a chave do covil.
  place(PIECE.ironChest, [at(76, 52), at(78, 52)]);
  place(PIECE.smallChest, [at(80, 52)]);
  place(PIECE.trunk, [at(90, 52)]);
  place(PIECE.goldChest, [at(93, 58)]);
  place(PIECE.coins, [at(92, 61), at(94, 61)]);
  place(PIECE.coinPile, [at(90, 61)]);
  place(PIECE.fewCoins, [at(88, 60)]);
  place(PIECE.goldArms, [at(76, 60)]);
  place(PIECE.arms, [at(78, 62)]);
  place(PIECE.key, [at(85, 56)]);
  place(PIECE.fancyCrate, [at(82, 62)]);
  place(PIECE.ornatePillar, [at(80, 56), at(87, 56)]);
  place(PIECE.torch, [at(74, 51), at(95, 51), at(74, 62), at(95, 62)]);
  // O covil do lich: o altar e o sarcófago dele entre os lagos, pilares, estátuas e o ouro.
  place(PIECE.altar, [at(51, 78)]);
  place(PIECE.sarcophagus, [at(51, 80), at(52, 80)]);
  place(PIECE.statue, [at(46, 76), at(57, 76)]);
  place(PIECE.ornatePillar, [at(46, 68), at(56, 68), at(46, 82), at(56, 82)]);
  place(PIECE.candelabrum, [at(49, 77), at(54, 77)]);
  place(PIECE.coinPile, [at(48, 80), at(55, 80)]);
  place(PIECE.goldChest, [at(53, 82)]);
  place(PIECE.bones, [at(30, 67), at(74, 67), at(29, 82), at(74, 82)]);
  place(PIECE.grave, [at(36, 81)]);
  place(PIECE.rubble, [at(34, 66)]);
  place(PIECE.openGrate, [at(63, 81)]);
  place(PIECE.rock, [at(34, 72), at(40, 77), at(65, 74), at(70, 71)]);
  place(PIECE.mushrooms, [at(29, 70), at(45, 70), at(60, 80)]);
  place(PIECE.torch, [at(28, 66), at(75, 66), at(28, 83), at(75, 83)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'masmorra', backdrop: 'dungeon' },
  });
}
