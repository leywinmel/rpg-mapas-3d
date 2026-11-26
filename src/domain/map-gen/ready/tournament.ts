/**
 * Torneio de Altamira (RPG-97, pedido do usuário em 26/11: "mais mapas, versões maiores"): o
 * campo de um torneio de cavaleiros, num mapa 104×88. No meio, a liça de areia com a barreira da
 * justa, as arquibancadas dos dois lados e o pavilhão do rei com a mesa do banquete. A oeste, o
 * acampamento dos cavaleiros com as tendas e as bandeiras; a leste, o campo de arqueiros e os
 * quartéis ao pé do castelo, ligado à estrada por uma rua de terra. Ao sul da estrada, a feira
 * com as barracas, a taverna e o poço, e o povoado. O mosteiro na montanha ficou de fora: a
 * Academia do Monte Kasumi já é esse mapa.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, rotatedFootprint, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { propFootprint } from '../kits';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const TOURNAMENT_SIZE = { width: 104, depth: 88 } as const;

const TILE = { grass: 'grama', dirt: 'terra', sand: 'areia', stone: 'piso-pedra' } as const;
const PIECE = {
  castle: 'kay-castelo',
  barracks: 'kay-quartel',
  redBarracks: 'kay-quartel-vermelho',
  archery: 'kay-campo-arqueiros',
  redArchery: 'kay-campo-arqueiros-vermelho',
  pavilion: 'kay-mercado-amarelo',
  stall: 'kay-mercado',
  greenStall: 'kay-mercado-verde',
  tavern: 'kay-taverna',
  tent: 'kay-tenda',
  well: 'kay-poco',
  cargo: 'kay-carga',
  tilt: 'kay-barreira',
  bench: 'kay-banco-rua',
  tripleBanner: 'kay-estandarte-triplo',
  blueStandard: 'kay-estandarte-azul',
  redStandard: 'kay-estandarte-vermelho',
  blueFlag: 'kay-bandeira-azul',
  redFlag: 'kay-bandeira-vermelha',
  greenFlag: 'kay-bandeira-verde',
  yellowFlag: 'kay-bandeira-amarela',
  arms: 'kay-espada-escudo',
  feastTable: 'kay-mesa-banquete-toalha',
  aleBarrel: 'kay-barril-chope',
  woods: 'kay-bosque',
  campfire: 'cav-fogueira',
  torch: 'tocha',
  barrel: 'barril',
  crate: 'med-caixote',
  oak: 'nat-carvalho',
  bush: 'nat-arbusto',
} as const;

/** A liça, as estradas, a feira e o acampamento. */
const LISTS: CellRect = { x: 28, z: 26, width: 48, depth: 20 };
const MAIN_ROAD: CellRect = { x: 0, z: 56, width: 104, depth: 4 };
const CASTLE_ROAD: CellRect = { x: 89, z: 13, width: 4, depth: 43 };
const FAIR: CellRect = { x: 2, z: 60, width: 50, depth: 26 };
const CAMP: CellRect = { x: 2, z: 4, width: 23, depth: 44 };

/** Giro da planta: a porta fica ao norte (0); as casas do povoado olham para a estrada. */
const DOOR = { north: 0 } as const;
/** Lado das casas comuns do povoado. */
const HOUSE_SIDE = 6;

type Plan = {
  readonly x: number;
  readonly z: number;
  readonly stories?: number;
  readonly use?: BuildingUse;
};

function hamletBuildings(): SketchBuilding[] {
  const plans: Plan[] = [60, 68, 76, 84, 92].flatMap((x, i) => [
    { x, z: 64, stories: i % 2 === 0 ? 2 : 1, use: x === 68 ? ('shop' as const) : undefined },
    { x, z: 76, stories: i % 2 === 0 ? 1 : 2 },
  ]);
  return plans.map((plan, i) => ({
    style: 'medieval',
    use: plan.use ?? 'house',
    x: plan.x,
    z: plan.z,
    width: HOUSE_SIDE,
    depth: HOUSE_SIDE,
    stories: plan.stories ?? 1,
    rotation: DOOR.north,
    level: 0,
    variant: i + 1,
  }));
}

function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...TOURNAMENT_SIZE }, TILE.grass);
  sketch.ground(CAMP, TILE.dirt);
  sketch.ground(FAIR, TILE.stone);
  sketch.ground(MAIN_ROAD, TILE.dirt);
  sketch.ground(CASTLE_ROAD, TILE.dirt);
  sketch.ground(LISTS, TILE.sand);
}

const at = (x: number, z: number): Cell => ({ x, z });
/** As colunas de tendas do acampamento e as fileiras, de seis em seis casas. */
const TENT_COLUMNS = [3, 9, 15, 21] as const;
const TENT_ROWS = [6, 12, 18, 24, 30, 36, 42] as const;
const FLAGS = [PIECE.blueFlag, PIECE.redFlag, PIECE.greenFlag, PIECE.yellowFlag] as const;

export function buildTournamentMap(): AssembledMap {
  const sketch = createSketch(TOURNAMENT_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, hamletBuildings());
  const placer = createPlacer(sketch);
  // Confere todas as casas que a peça ocupa, não só a âncora: nada pode cair dentro de uma casa.
  const place = (piece: string, cells: readonly Cell[], rotation = 0) => {
    for (const cell of cells) {
      const size = rotatedFootprint(propFootprint(piece), rotation);
      for (let dz = 0; dz < size.depth; dz += 1) {
        for (let dx = 0; dx < size.width; dx += 1) {
          const key = `${cell.x + dx},${cell.z + dz}`;
          if (indoors.has(key)) throw new Error(`${piece} dentro de casa em ${key}.`);
        }
      }
      placer(piece, cell, rotation);
    }
  };

  // O castelo ao norte, os quartéis, o campo de arqueiros e as armas.
  place(PIECE.castle, [at(86, 2)]);
  place(PIECE.barracks, [at(95, 20)]);
  place(PIECE.redBarracks, [at(95, 32)]);
  place(PIECE.redArchery, [at(80, 26)]);
  place(PIECE.archery, [at(80, 36)]);
  place(PIECE.arms, [at(95, 42), at(98, 42), at(95, 45)]);
  place(PIECE.torch, [at(88, 14), at(93, 14), at(88, 50), at(93, 50)]);
  // O bosque do norte.
  place(PIECE.woods, [at(28, 2), at(60, 2), at(72, 2)]);
  place(PIECE.oak, [at(39, 4), at(42, 9), at(57, 6), at(82, 16), at(78, 50)]);
  // A liça: a barreira da justa no meio e as bandeiras das duas pontas.
  for (let x = 32; x <= 70; x += 3) place(PIECE.tilt, [at(x, 35)]);
  place(PIECE.blueFlag, [at(29, 31), at(29, 38)]);
  place(PIECE.redFlag, [at(74, 31), at(74, 38)]);
  place(PIECE.blueStandard, [at(26, 25)]);
  place(PIECE.redStandard, [at(76, 25), at(76, 46), at(26, 46)]);
  // As arquibancadas: duas fileiras de bancos de cada lado da liça.
  for (let x = 30; x <= 72; x += 3)
    place(PIECE.bench, [at(x, 23), at(x, 24), at(x, 47), at(x, 48)]);
  // O pavilhão do rei, os estandartes e a mesa do banquete.
  place(PIECE.pavilion, [at(47, 14)]);
  place(PIECE.tripleBanner, [at(43, 21), at(57, 21)]);
  place(PIECE.feastTable, [at(60, 14), at(63, 14), at(66, 14)]);
  place(PIECE.aleBarrel, [at(70, 14), at(70, 16)]);
  // O acampamento dos cavaleiros: tendas em fileiras, bandeiras entre elas e as fogueiras.
  TENT_ROWS.forEach((z, row) => {
    place(
      PIECE.tent,
      TENT_COLUMNS.map((x) => at(x, z)),
    );
    place(FLAGS[row % FLAGS.length] ?? PIECE.blueFlag, [at(7, z), at(19, z)]);
  });
  place(PIECE.campfire, [at(13, 10), at(13, 28), at(13, 46)]);
  place(PIECE.arms, [at(12, 22), at(12, 34)]);
  // A estrada: as tochas dos dois lados.
  for (const x of [10, 22, 34, 46, 58, 70, 82]) place(PIECE.torch, [at(x, 55), at(x, 60)]);
  // A feira: as barracas, a taverna, as tendas dos mascates, o poço e a carga.
  place(PIECE.stall, [at(4, 62)]);
  place(PIECE.greenStall, [at(16, 62)]);
  place(PIECE.pavilion, [at(28, 62)]);
  place(PIECE.tavern, [at(40, 62)]);
  place(PIECE.tent, [at(4, 74), at(10, 74), at(16, 74), at(22, 74)]);
  place(PIECE.well, [at(30, 74)]);
  place(PIECE.cargo, [at(36, 74)]);
  place(PIECE.aleBarrel, [at(47, 64), at(47, 66)]);
  place(PIECE.barrel, [at(26, 72), at(27, 72), at(40, 78)]);
  place(PIECE.crate, [at(41, 78), at(8, 80), at(9, 80)]);
  // As árvores soltas em volta do povoado.
  place(PIECE.oak, [at(56, 66), at(56, 78), at(100, 66), at(100, 78), at(66, 85), at(88, 85)]);
  place(PIECE.bush, [at(54, 84), at(78, 72)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'forest' },
  });
}
