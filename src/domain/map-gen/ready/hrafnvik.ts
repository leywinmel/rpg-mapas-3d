/**
 * Fiorde de Hrafnvik (RPG-86, pedido do usuário em 26/11: "mais mapas, versões maiores"): a vila
 * nórdica no inverno, num mapa 104×88 coberto de neve. O mar gelado fecha o sul e entra pelo fiorde,
 * onde o barco longo do jarl está atracado entre dois píeres. Ao norte da estrada, a fortaleza de
 * paliçada com o grande salão, as casas da guarda, o poço e a torre de vigia. A oeste, a vila: as
 * casas, a ferraria, as pilhas de lenha e o armazém do cais. A leste, o acampamento dos caçadores e
 * o círculo de pedras rúnicas com o santuário; no nordeste, o lago congelado e a torre em ruínas;
 * no noroeste, as montanhas e o pinhal.
 */
import type { Cell } from '../../grid';
import { createDefaultHeader, type CellRect } from '../../map-v2';
import type { AssembledMap } from '../assemble';
import type { BuildingUse } from '../blueprint';
import { createPlacer } from './placer';
import { createSketch, stampBuildings, type Sketch, type SketchBuilding } from './sketch';

export const HRAFNVIK_SIZE = { width: 104, depth: 88 } as const;

const TILE = {
  snow: 'neve',
  ice: 'gelo',
  dirt: 'terra',
  water: 'agua',
  planks: 'piso-madeira',
} as const;
const PIECE = {
  longship: 'med-navio',
  boat: 'med-bote',
  palisade: 'med-cerca-madeira',
  tower: 'kay-torre-vigia',
  ruin: 'kay-ruina',
  banner: 'kay-estandarte-vermelho',
  well: 'kay-poco',
  smithy: 'kay-ferraria',
  logs: 'kay-pilha-madeira',
  tent: 'kay-tenda',
  campfire: 'cav-fogueira',
  runestone: 'kay-pilar-pedra',
  shrine: 'kay-santuario',
  skull: 'kay-cranio',
  bone: 'kay-osso-longo',
  sack: 'kay-saco',
  barrel: 'barril',
  crate: 'med-caixote',
  torch: 'tocha',
  lamp: 'kay-poste-lanterna',
  mountainA: 'kay-montanha-a',
  mountainB: 'kay-montanha-b',
  mountainC: 'kay-montanha-c',
  pineGrove: 'kay-pinhal-grande',
  pine: 'nat-pinheiro',
  deadTree: 'nat-arvore-seca',
  rock: 'rocha',
} as const;

/** O mar, o fiorde, o lago congelado, a estrada, o caminho do cais e o cais. */
const SEA: CellRect = { x: 0, z: 70, width: 104, depth: 18 };
const FJORD: CellRect = { x: 40, z: 50, width: 16, depth: 20 };
const FROZEN_LAKE: CellRect = { x: 70, z: 6, width: 24, depth: 16 };
const ROAD: CellRect = { x: 0, z: 36, width: 104, depth: 4 };
const DOCK_PATH: CellRect = { x: 36, z: 40, width: 4, depth: 22 };
const QUAY: CellRect = { x: 36, z: 62, width: 4, depth: 8 };
const WEST_PIER: CellRect = { x: 40, z: 50, width: 2, depth: 20 };
const EAST_PIER: CellRect = { x: 54, z: 50, width: 2, depth: 20 };
/** A fortaleza de paliçada, com o portão no lado sul, de frente para a estrada. */
const STRONGHOLD: CellRect = { x: 30, z: 6, width: 34, depth: 24 };
const GATE = { from: 45, to: 48 } as const;

/** Giro da planta: a porta fica ao norte (0), oeste (1), sul (2) ou leste (3). */
const DOOR = { north: 0, west: 1, south: 2, east: 3 } as const;
/** Lado das casas comuns. */
const HOUSE_SIDE = 6;

type Plan = {
  readonly x: number;
  readonly z: number;
  readonly door: number;
  readonly width?: number;
  readonly depth?: number;
  readonly stories?: number;
  readonly use?: BuildingUse;
};

function hrafnvikBuildings(): SketchBuilding[] {
  const plans: Plan[] = [
    // O grande salão do jarl e as duas casas da guarda, dentro da paliçada.
    { x: 38, z: 9, door: DOOR.south, width: 18, depth: 8, stories: 2 },
    { x: 32, z: 20, door: DOOR.east },
    { x: 56, z: 20, door: DOOR.west },
    // A fileira da vila, de porta para a estrada.
    ...[4, 12, 20, 28].map((x, i) => ({ x, z: 41, door: DOOR.north, stories: i % 2 ? 2 : 1 })),
    // A segunda fileira e o armazém do cais.
    { x: 14, z: 52, door: DOOR.north },
    { x: 22, z: 52, door: DOOR.north, stories: 2 },
    { x: 27, z: 61, door: DOOR.east, width: 8, depth: 6, use: 'shop' },
  ];
  return plans.map((plan, i) => ({
    style: 'medieval',
    use: plan.use ?? 'house',
    x: plan.x,
    z: plan.z,
    width: plan.width ?? HOUSE_SIDE,
    depth: plan.depth ?? HOUSE_SIDE,
    stories: plan.stories ?? 1,
    rotation: plan.door,
    level: 0,
    variant: i + 1,
  }));
}

function lay(sketch: Sketch): void {
  sketch.ground({ x: 0, z: 0, ...HRAFNVIK_SIZE }, TILE.snow);
  for (const path of [ROAD, DOCK_PATH]) sketch.ground(path, TILE.dirt);
  sketch.ground(FROZEN_LAKE, TILE.ice);
  sketch.ground(SEA, TILE.water);
  sketch.ground(FJORD, TILE.water);
  for (const deck of [QUAY, WEST_PIER, EAST_PIER]) sketch.ground(deck, TILE.planks);
}

const inside = (cell: Cell, r: CellRect) =>
  cell.x >= r.x && cell.x < r.x + r.width && cell.z >= r.z && cell.z < r.z + r.depth;
const at = (x: number, z: number): Cell => ({ x, z });
/** Só o que flutua vai para a água; as rochas ficam tanto na praia quanto no mar. */
const AFLOAT = new Set<string>([PIECE.longship, PIECE.boat]);

/** A paliçada: a borda da fortaleza, aberta no portão sul; os lados leste e oeste giram. */
function palisadeCells(): Array<{ cell: Cell; rotation: number }> {
  const { x: x0, z: z0, width, depth } = STRONGHOLD;
  const right = x0 + width - 1;
  const bottom = z0 + depth - 1;
  const cells: Array<{ cell: Cell; rotation: number }> = [];
  for (let x = x0; x <= right; x += 1) {
    cells.push({ cell: at(x, z0), rotation: 0 });
    if (x < GATE.from || x > GATE.to) cells.push({ cell: at(x, bottom), rotation: 0 });
  }
  for (let z = z0 + 1; z < bottom; z += 1) {
    cells.push({ cell: at(x0, z), rotation: 1 }, { cell: at(right, z), rotation: 1 });
  }
  return cells;
}

/** As pedras rúnicas em roda, em volta do santuário. */
function runeCircle(center: Cell, radius: number, count: number): Cell[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return at(
      Math.round(center.x + Math.cos(angle) * radius),
      Math.round(center.z + Math.sin(angle) * radius),
    );
  });
}

export function buildHrafnvikMap(): AssembledMap {
  const sketch = createSketch(HRAFNVIK_SIZE, null);
  lay(sketch);
  const indoors = stampBuildings(sketch, hrafnvikBuildings());
  const placer = createPlacer(sketch);
  const place = (piece: string, cells: readonly Cell[], rotation = 0) => {
    for (const cell of cells) {
      if (indoors.has(`${cell.x},${cell.z}`))
        throw new Error(`${piece} dentro de casa em ${cell.x},${cell.z}.`);
      const wet =
        [SEA, FJORD].some((r) => inside(cell, r)) &&
        ![WEST_PIER, EAST_PIER].some((r) => inside(cell, r));
      if (piece !== PIECE.rock && wet !== AFLOAT.has(piece))
        throw new Error(`${piece} fora do lugar (água?) em ${cell.x},${cell.z}.`);
      placer(piece, cell, rotation);
    }
  };

  // A fortaleza: a paliçada, a torre de vigia, o poço, os estandartes e as tochas do portão.
  for (const { cell, rotation } of palisadeCells()) place(PIECE.palisade, [cell], rotation);
  place(PIECE.tower, [at(57, 8)]);
  place(PIECE.well, [at(40, 21)]);
  place(PIECE.banner, [at(44, 28), at(49, 28), at(46, 18)]);
  place(PIECE.torch, [at(44, 30), at(49, 30), at(37, 17), at(56, 17)]);
  place(PIECE.barrel, [at(32, 8), at(33, 8), at(32, 9), at(61, 26), at(61, 27)]);
  place(PIECE.crate, [at(52, 26), at(53, 26), at(35, 27)]);
  place(PIECE.logs, [at(50, 21)]);
  // O fiorde: o barco longo do jarl entre os píeres, outros dois no mar e os botes.
  place(PIECE.longship, [at(46, 54), at(66, 74), at(14, 76)]);
  place(PIECE.boat, [at(43, 66), at(51, 58), at(30, 78), at(80, 72), at(52, 64)]);
  place(PIECE.rock, [at(4, 84), at(92, 80), at(52, 84), at(100, 72)]);
  // O cais: barris, caixotes, sacos e lanternas.
  place(PIECE.barrel, [at(36, 64), at(37, 64), at(36, 65), at(41, 69), at(55, 69)]);
  place(PIECE.crate, [at(38, 67), at(39, 67), at(54, 51)]);
  place(PIECE.sack, [at(36, 68), at(37, 68)]);
  place(PIECE.lamp, [at(35, 62), at(41, 50), at(55, 50), at(35, 45)]);
  // A vila: lanternas na estrada, a ferraria, as pilhas de lenha e o que sobra nas portas.
  for (const x of [2, 18, 34, 58, 74, 90]) place(PIECE.lamp, [at(x, 35), at(x + 8, 40)]);
  place(PIECE.smithy, [at(2, 52)]);
  place(PIECE.logs, [at(10, 60), at(16, 63), at(2, 47)]);
  place(PIECE.barrel, [at(10, 50), at(11, 50), at(20, 59), at(26, 59)]);
  place(PIECE.sack, [at(28, 59), at(29, 59)]);
  place(PIECE.campfire, [at(19, 67)]);
  // O acampamento dos caçadores, a leste da vila.
  place(PIECE.tent, [at(62, 44), at(68, 42)]);
  place(PIECE.campfire, [at(66, 48)]);
  place(PIECE.logs, [at(60, 50)]);
  place(PIECE.bone, [at(71, 47), at(63, 48)]);
  // O círculo de pedras rúnicas e o santuário.
  place(PIECE.runestone, runeCircle(at(80, 54), 6, 8));
  place(PIECE.shrine, [at(80, 54)]);
  place(PIECE.skull, [at(78, 56), at(83, 52)]);
  place(PIECE.deadTree, [at(72, 60), at(89, 47), at(86, 62)]);
  // O lago congelado, o abrigo dos pescadores e a torre em ruínas.
  place(PIECE.tent, [at(95, 10)]);
  place(PIECE.campfire, [at(95, 15)]);
  place(PIECE.barrel, [at(98, 14), at(98, 15)]);
  place(PIECE.ruin, [at(66, 24)]);
  place(PIECE.rock, [at(72, 4), at(88, 3), at(96, 22), at(68, 18)]);
  // As montanhas e o pinhal do noroeste, e a montanha do sudeste.
  place(PIECE.mountainA, [at(1, 1)]);
  place(PIECE.mountainB, [at(11, 1)]);
  place(PIECE.pineGrove, [at(20, 2)]);
  place(PIECE.mountainC, [at(93, 58)]);
  place(PIECE.pine, [
    at(2, 14),
    at(8, 18),
    at(14, 14),
    at(20, 20),
    at(25, 15),
    at(4, 26),
    at(12, 28),
    at(22, 30),
    at(27, 25),
    at(66, 4),
    at(100, 4),
    at(100, 28),
    at(76, 30),
    at(86, 30),
    at(94, 44),
    at(101, 50),
    at(62, 62),
    at(68, 66),
    at(4, 64),
    at(8, 68),
  ]);
  place(PIECE.rock, [at(16, 32), at(28, 33), at(90, 34), at(60, 66), at(96, 52)]);

  const header = createDefaultHeader();
  return sketch.build({
    ...header,
    ambience: { ...header.ambience, preset: 'vila', backdrop: 'sea' },
  });
}
