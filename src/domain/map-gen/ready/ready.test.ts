import { describe, expect, it } from 'vitest';
import type { Cell } from '../../grid';
import {
  parseChunk,
  rotatedFootprint,
  serializeChunk,
  type MapModel,
  type MapPiece,
} from '../../map-v2';
import { STYLE_KITS } from '../kits';
import { READY_MAPS, readyMap } from '.';
import { CAVE_SIZE, caveFloors } from './cave';
import { chromeDocksFloors } from './chrome-docks';
import { cityCenterFloors } from './city-center';
import { colonyFloors } from './colony';
import { desertFloors } from './desert';
import { forestFloors } from './forest';
import { gasStationFloors } from './gas-station';
import { hospitalFloors } from './hospital';
import { islandFloors } from './island';
import { medievalTownFloors } from './medieval-town';
import { modernTownFloors } from './modern-town';
import { neonDistrictFloors } from './neon-district';
import { portFloors } from './port';
import { schoolFloors } from './school';
import { buildShipMap, SHIP_SIZE } from './ship';
import { stationFloors } from './station';
import { templeSchoolFloors } from './temple-school';
import { walledTownFloors } from './walled-town';

function allPieces(model: MapModel): MapPiece[] {
  return [...model.chunks.values()].flatMap((chunk) => chunk.pieces);
}

/** Pisos soltos (convés, laje) recebem as outras peças por cima: não contam como ocupação. */
const SLABS = new Set(Object.values(STYLE_KITS).flatMap((kit) => kit.tiles.indoor));
const isSlab = (piece: MapPiece) =>
  piece.asset.source === 'catalog' &&
  (piece.asset.key.includes('assoalho') || SLABS.has(piece.asset.key));

describe('mapas prontos', () => {
  it.each(READY_MAPS)('shouldMakeChunksTheDomainAccepts ($id)', (ready) => {
    const { model, dropped, pieces } = ready.build();
    expect(dropped).toBe(0);
    expect(pieces).toBeGreaterThan(0);
    expect(model.size).toEqual(ready.size);
    for (const chunk of model.chunks.values()) {
      const parsed = parseChunk(JSON.parse(JSON.stringify(serializeChunk(chunk))), {
        size: model.size,
        coord: chunk.coord,
      });
      expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    }
  });

  it.each(READY_MAPS)('shouldNotStackTwoPiecesOnTheSameCell ($id)', (ready) => {
    const taken = new Map<string, string>();
    for (const piece of allPieces(ready.build().model)) {
      if (isSlab(piece)) continue;
      const size = rotatedFootprint(piece.footprint, piece.rotation);
      for (let dz = 0; dz < size.depth; dz += 1) {
        for (let dx = 0; dx < size.width; dx += 1) {
          const cell = `${piece.x + dx},${piece.z + dz}@${piece.level}`;
          const key = piece.asset.source === 'catalog' ? piece.asset.key : piece.asset.assetId;
          expect(taken.get(cell), `${key} em ${cell}`).toBeUndefined();
          taken.set(cell, key);
        }
      }
    }
  });

  it('shouldFindAReadyMapById', () => {
    expect(readyMap('navio')?.size).toEqual(SHIP_SIZE);
    expect(readyMap('nada')).toBeUndefined();
  });
});

describe('navio de guerra', () => {
  const { model } = buildShipMap();
  const pieces = allPieces(model);
  const count = (key: string) =>
    pieces.filter((piece) => piece.asset.source === 'catalog' && piece.asset.key === key).length;

  it('shouldHaveTheThreeFloorsOfAShip', () => {
    const levels = new Set(pieces.filter(isSlab).map((piece) => piece.level));
    expect([...levels].sort((a, b) => a - b)).toEqual([4, 8]);
  });

  it('shouldArmTheShipAndRigItWithMasts', () => {
    expect(count('nav-canhao')).toBe(12);
    expect(count('nav-mastro')).toBe(3);
    expect(count('nav-timao')).toBe(1);
    expect(count('nav-gurupes')).toBe(1);
    expect(count('nav-rede')).toBe(12);
  });

  it('shouldLeaveTheHatchesOpenOverTheStairs', () => {
    const deck = new Set(
      pieces.filter((piece) => isSlab(piece) && piece.level === 4).map((p) => `${p.x},${p.z}`),
    );
    for (const stairs of pieces.filter(
      (piece) =>
        piece.asset.source === 'catalog' &&
        piece.asset.key === 'med-escada-interna' &&
        piece.level === 0,
    )) {
      for (let dz = 0; dz < 3; dz += 1)
        expect(deck.has(`${stairs.x},${stairs.z + dz}`)).toBe(false);
    }
  });
});

type Floors = ReadonlyMap<string, { readonly tile: string; readonly height: number }>;

/** Casas de chão seco que não se alcançam a partir de `start`, um degrau por passo. */
function unreachableDryCells(floors: Floors, start: string): string[] {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const [x, z] = queue.shift()!.split(',').map(Number);
    const height = floors.get(`${x},${z}`)!.height;
    for (const [nx, nz] of [
      [x! + 1, z!],
      [x! - 1, z!],
      [x!, z! + 1],
      [x!, z! - 1],
    ]) {
      const next = `${nx},${nz}`;
      const floor = floors.get(next);
      if (!floor || seen.has(next) || Math.abs(floor.height - height) > 1) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return [...floors]
    .filter(([cell, floor]) => floor.tile !== 'agua' && !seen.has(cell))
    .map(([cell]) => cell);
}

const waterHeights = (floors: Floors) => [
  ...new Set([...floors.values()].filter((floor) => floor.tile === 'agua').map((f) => f.height)),
];

describe('caverna dos ecos', () => {
  // Ninguém fica preso: da boca do túnel se chega a todo chão seco subindo ou descendo um
  // degrau por vez.
  it('shouldReachEveryDryFloorFromTheMouthOneStepAtATime', () => {
    const floors = caveFloors();
    const mouth = [...floors.keys()].find((cell) => cell.endsWith(`,${CAVE_SIZE.depth - 1}`))!;
    expect(unreachableDryCells(floors, mouth)).toEqual([]);
  });

  it('shouldKeepTheLakeOneStepBelowItsShore', () => {
    expect(waterHeights(caveFloors())).toEqual([0]);
  });
});

describe('bosque das sombras', () => {
  it('shouldReachEveryDryCellFromTheTrailOneStepAtATime', () => {
    const floors = forestFloors();
    const start = [...floors].find(([, floor]) => floor.tile === 'terra')![0];
    expect(unreachableDryCells(floors, start)).toEqual([]);
  });

  it('shouldKeepTheStreamOneStepBelowTheBridge', () => {
    const floors = forestFloors();
    expect(waterHeights(floors)).toEqual([0]);
    const bridge = [...floors.values()].filter((floor) => floor.tile === 'piso-madeira');
    expect(bridge.length).toBeGreaterThan(0);
    expect(new Set(bridge.map((floor) => floor.height))).toEqual(new Set([1]));
  });

  it('shouldFillTheWoodsWithTrees', () => {
    const { model } = readyMap('bosque-sombras')!.build();
    const trees = allPieces(model).filter(
      (piece) =>
        piece.asset.source === 'catalog' &&
        /carvalho|pinheiro|betula|^arvore$/.test(piece.asset.key),
    );
    expect(trees.length).toBeGreaterThan(300);
  });
});

describe('areias do sol', () => {
  it('shouldReachEveryDryCellOneStepAtATime', () => {
    expect(unreachableDryCells(desertFloors(), '0,0')).toEqual([]);
  });

  it('shouldKeepTheOasisOneStepBelowItsShore', () => {
    const floors = desertFloors();
    expect(waterHeights(floors)).toEqual([0]);
    expect(floors.get('11,12')?.tile).toBe('agua');
  });
});

describe('porto da maré', () => {
  it('shouldReachEveryDryCellOneStepAtATime', () => {
    expect(unreachableDryCells(portFloors(), '0,0')).toEqual([]);
  });

  it('shouldKeepTheSeaOneStepBelowTheDocks', () => {
    const floors = portFloors();
    expect(waterHeights(floors)).toEqual([0]);
    expect(floors.get('20,40')).toEqual({ tile: 'piso-madeira', height: 1 });
  });
});

describe('vila da ponte velha', () => {
  it('shouldReachEveryDryCellOneStepAtATime', () => {
    expect(unreachableDryCells(medievalTownFloors(), '0,0')).toEqual([]);
  });

  it('shouldCrossTheRiverOnABridgeOneStepAboveTheWater', () => {
    const floors = medievalTownFloors();
    expect(waterHeights(floors)).toEqual([0]);
    expect(floors.get('8,23')).toEqual({ tile: 'piso-madeira', height: 1 });
    expect(floors.get('33,6')).toEqual({ tile: 'piso-pedra', height: 4 });
  });
});

describe('burgo do monte alto', () => {
  it('shouldReachEveryDryCellOneStepAtATime', () => {
    expect(unreachableDryCells(walledTownFloors(), '0,0')).toEqual([]);
  });

  it('shouldClimbFromTheLakeToTheCastle', () => {
    const floors = walledTownFloors();
    expect(waterHeights(floors)).toEqual([0]);
    expect(floors.get('23,39')).toEqual({ tile: 'med-calcamento', height: 2 });
    expect(floors.get('24,8')).toEqual({ tile: 'piso-pedra', height: 5 });
  });
});

describe('bairro da orla', () => {
  it('shouldReachEveryDryCellOneStepAtATime', () => {
    expect(unreachableDryCells(modernTownFloors(), '0,0')).toEqual([]);
  });

  it('shouldKeepTheLakeOneStepBelowTheBeach', () => {
    const floors = modernTownFloors();
    expect(waterHeights(floors)).toEqual([0]);
    expect(floors.get('30,44')).toEqual({ tile: 'piso-madeira', height: 1 });
    expect(floors.get('23,5')).toEqual({ tile: 'mod-asfalto', height: 4 });
  });
});

describe('centro da cidade', () => {
  it('shouldReachEveryCellOneStepAtATime', () => {
    expect(unreachableDryCells(cityCenterFloors(), '0,0')).toEqual([]);
  });

  it('shouldRaiseTheCivicPlazaOneStepAboveTheStreet', () => {
    const floors = cityCenterFloors();
    expect(floors.get('22,22')).toEqual({ tile: 'mod-asfalto', height: 1 });
    expect(floors.get('35,10')).toEqual({ tile: 'piso-pedra', height: 2 });
  });
});

describe('colônia astra', () => {
  it('shouldReachEveryCellOneStepAtATime', () => {
    expect(unreachableDryCells(colonyFloors(), '0,0')).toEqual([]);
  });

  it('shouldStackTheThreeDecksFromNorthToSouth', () => {
    const floors = colonyFloors();
    expect(floors.get('36,10')).toEqual({ tile: 'fut-piso-quadriculado', height: 3 });
    expect(floors.get('23,23')).toEqual({ tile: 'fut-piso-metal', height: 2 });
    expect(floors.get('37,36')).toEqual({ tile: 'fut-piso-metal', height: 1 });
  });
});

describe('estação vega', () => {
  it('shouldReachEveryRoomFromTheBridge', () => {
    expect(unreachableDryCells(stationFloors(), '21,5')).toEqual([]);
  });

  it('shouldRaiseTheCaptainDaisAndSinkTheReactorPit', () => {
    const floors = stationFloors();
    expect(floors.get('21,2')).toEqual({ tile: 'fut-piso-liso', height: 2 });
    expect(floors.get('36,29')).toEqual({ tile: 'fut-piso-metal', height: 0 });
    expect(floors.get('21,20')).toEqual({ tile: 'fut-piso-quadriculado', height: 1 });
  });

  it('shouldLeaveTheVoidOfSpaceWithoutFloor', () => {
    expect(stationFloors().has('0,0')).toBe(false);
  });
});

describe('distrito neon', () => {
  it('shouldReachEveryDryCellOneStepAtATime', () => {
    expect(unreachableDryCells(neonDistrictFloors(), '0,0')).toEqual([]);
  });

  it('shouldKeepTheCanalBelowTheStreetAndThePlazaAbove', () => {
    const floors = neonDistrictFloors();
    expect(waterHeights(floors)).toEqual([0]);
    expect(floors.get('23,34')).toEqual({ tile: 'cyb-asfalto', height: 1 });
    expect(floors.get('36,24')).toEqual({ tile: 'cyb-praca-neon', height: 2 });
  });
});

describe('cais cromo', () => {
  it('shouldReachEveryDryCellOneStepAtATime', () => {
    expect(unreachableDryCells(chromeDocksFloors(), '0,0')).toEqual([]);
  });

  it('shouldKeepTheSeaBelowTheQuayAndThePiersOverIt', () => {
    const floors = chromeDocksFloors();
    expect(waterHeights(floors)).toEqual([0]);
    expect(floors.get('7,44')).toEqual({ tile: 'cyb-piso-grade', height: 1 });
    expect(floors.get('20,44')?.tile).toBe('agua');
    expect(floors.get('42,25')).toEqual({ tile: 'cyb-piso-grade', height: 2 });
  });
});

describe('ilha do vulcão', () => {
  it('shouldReachEveryDryCellFromTheVillage', () => {
    expect(unreachableDryCells(islandFloors(), '60,88')).toEqual([]);
  });

  it('shouldRiseFromTheSeaToTheVolcanoPeak', () => {
    const floors = islandFloors();
    expect(waterHeights(floors)).toEqual([0]);
    expect(floors.get('0,0')?.tile).toBe('agua');
    expect(floors.get('60,60')).toEqual({ tile: 'chao-rachado', height: 8 });
    expect(floors.get('60,100')).toEqual({ tile: 'piso-madeira', height: 1 });
  });
});

describe('academia do monte kasumi', () => {
  it('shouldReachEveryDryCellFromTheFootOfTheMountain', () => {
    expect(unreachableDryCells(templeSchoolFloors(), '31,63')).toEqual([]);
  });

  it('shouldClimbTheTerracesByTheStoneStairs', () => {
    const floors = templeSchoolFloors();
    expect(waterHeights(floors)).toEqual([0]);
    const path = [63, 53, 51, 40, 36, 34, 28, 20, 18, 16].map((z) => floors.get(`31,${z}`)?.height);
    expect(path).toEqual([1, 2, 4, 5, 6, 8, 9, 10, 12, 13]);
    expect(floors.get('29,51')).toEqual({ tile: 'grama', height: 1 });
    expect(floors.get('10,45')?.tile).toBe('terra');
  });
});

describe('escola do bairro alto', () => {
  it('shouldReachEveryCellOneStepAtATime', () => {
    expect(unreachableDryCells(schoolFloors(), '0,0')).toEqual([]);
  });

  it('shouldRaiseThePatioAndTheEntranceOneStepAboveTheCampus', () => {
    const floors = schoolFloors();
    expect(floors.get('55,46')).toEqual({ tile: 'piso-pedra', height: 2 });
    expect(floors.get('20,50')).toEqual({ tile: 'grama', height: 1 });
    expect(floors.get('12,50')).toEqual({ tile: 'terra', height: 1 });
    expect(floors.get('50,93')).toEqual({ tile: 'mod-asfalto', height: 1 });
  });

  it('shouldFurnishTheClassroomsWithDesksAndBoards', () => {
    const { model } = readyMap('escola-bairro-alto')!.build();
    const keys = allPieces(model).map((piece) =>
      piece.asset.source === 'catalog' ? piece.asset.key : '',
    );
    expect(keys.filter((key) => key === 'esc-lousa').length).toBe(18);
    expect(keys.filter((key) => key === 'esc-carteira').length).toBeGreaterThan(200);
    expect(keys).toContain('hos-leito');
  });
});

describe('hospital central', () => {
  it('shouldReachEveryDryCellOneStepAtATime', () => {
    expect(unreachableDryCells(hospitalFloors(), '0,0')).toEqual([]);
  });

  it('shouldSinkTheLakeAndRaiseThePlazaAndTheHelipad', () => {
    const floors = hospitalFloors();
    expect(waterHeights(floors)).toEqual([0]);
    expect(floors.get('55,28')).toEqual({ tile: 'agua', height: 0 });
    expect(floors.get('40,18')).toEqual({ tile: 'grama', height: 1 });
    expect(floors.get('100,140')).toEqual({ tile: 'piso-pedra', height: 2 });
    expect(floors.get('176,18')).toEqual({ tile: 'piso-pedra', height: 2 });
  });

  it('shouldFurnishTheWardsWithBedsDripsAndMonitors', () => {
    const { model } = readyMap('hospital-central')!.build();
    const keys = allPieces(model).map((piece) =>
      piece.asset.source === 'catalog' ? piece.asset.key : '',
    );
    expect(keys.filter((key) => key === 'hos-leito').length).toBeGreaterThan(300);
    expect(keys).toContain('hos-soro');
    expect(keys).toContain('hos-monitor');
    expect(keys).toContain('hos-balcao');
    expect(keys).toContain('hos-heliponto');
  });
});

describe('posto da rodovia', () => {
  it('shouldReachEveryCellOneStepAtATime', () => {
    expect(unreachableDryCells(gasStationFloors(), '0,0')).toEqual([]);
  });

  it('shouldOpenTheDrivewaysToTheHighway', () => {
    const floors = gasStationFloors();
    expect(floors.get('8,40')).toEqual({ tile: 'mod-asfalto', height: 1 });
    expect(floors.get('24,40')).toEqual({ tile: 'grama', height: 1 });
    expect(floors.get('20,30')).toEqual({ tile: 'mod-calcada', height: 1 });
  });

  it('shouldCoverEightPumpsAndFurnishTheShop', () => {
    const pieces = allPieces(readyMap('posto-rodovia')!.build().model);
    const keys = pieces.map((piece) => (piece.asset.source === 'catalog' ? piece.asset.key : ''));
    expect(keys.filter((key) => key === 'pos-bomba').length).toBe(8);
    expect(keys.filter((key) => key === 'pos-pilar').length).toBe(4);
    const canopies = pieces.filter(
      (piece) => piece.asset.source === 'catalog' && piece.asset.key === 'pos-cobertura',
    );
    // A cobertura fica em cima dos pilares de 3 (seis degraus) acima do pátio.
    expect(canopies.map((piece) => piece.level)).toEqual([7, 7]);
    expect(keys).toContain('pos-placa-precos');
    expect(keys).toContain('mod-prateleira');
  });
});

/** Anda de casa em casa sem atravessar parede: passa pela parede com porta e pelos vãos. */
function walkFrom(model: MapModel, start: Cell): Set<string> {
  const walls = new Set(
    [...model.chunks.values()].flatMap((chunk) =>
      chunk.walls
        .filter((wall) => !wall.style.includes('porta'))
        .map((wall) => `${wall.x},${wall.z},${wall.side}`),
    ),
  );
  const blocked = (from: Cell, to: Cell) => {
    if (to.x !== from.x) return walls.has(`${Math.max(from.x, to.x)},${from.z},west`);
    return walls.has(`${from.x},${Math.max(from.z, to.z)},north`);
  };
  const seen = new Set([`${start.x},${start.z}`]);
  const queue = [start];
  for (let cell = queue.shift(); cell; cell = queue.shift()) {
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const next = { x: cell.x + dx, z: cell.z + dz };
      const id = `${next.x},${next.z}`;
      const outside =
        next.x < 0 || next.z < 0 || next.x >= model.size.width || next.z >= model.size.depth;
      if (outside || seen.has(id) || blocked(cell, next)) continue;
      seen.add(id);
      queue.push(next);
    }
  }
  return seen;
}

describe('taverna do javali', () => {
  it('shouldReachEveryRoomFromTheStreetThroughTheDoors', () => {
    const { model } = readyMap('taverna-javali')!.build();
    const reached = walkFrom(model, { x: 10, z: 21 });
    expect(reached.size).toBe(model.size.width * model.size.depth);
  });

  it('shouldFurnishTheTavernWithTheKayKitPieces', () => {
    const { model } = readyMap('taverna-javali')!.build();
    const kaykit = allPieces(model).filter(
      (piece) => piece.asset.source === 'catalog' && piece.asset.key.startsWith('kay-'),
    );
    expect(kaykit.length).toBeGreaterThan(60);
  });
});

const kayPieces = (model: MapModel) =>
  allPieces(model).filter(
    (piece) => piece.asset.source === 'catalog' && piece.asset.key.startsWith('kay-'),
  );
const keysOf = (model: MapModel) =>
  allPieces(model).flatMap((piece) => (piece.asset.source === 'catalog' ? [piece.asset.key] : []));

describe('cemitério da colina', () => {
  const { model } = readyMap('cemiterio-colina')!.build();

  it('shouldReachEveryCellFromTheRoadThroughTheHutDoor', () => {
    expect(walkFrom(model, { x: 19, z: 39 }).size).toBe(model.size.width * model.size.depth);
  });

  it('shouldHaveTheCryptTheOpenGraveAndRowsOfGraves', () => {
    const keys = keysOf(model);
    expect(keys.filter((key) => key === 'kay-mausoleu')).toHaveLength(1);
    expect(keys).toContain('kay-cova-aberta');
    expect(keys).toContain('kay-portao-cemiterio');
    expect(kayPieces(model).length).toBeGreaterThan(150);
  });
});

describe('restaurante da esquina', () => {
  const { model } = readyMap('restaurante-esquina')!.build();

  it('shouldReachEveryRoomFromTheSidewalkThroughTheDoors', () => {
    expect(walkFrom(model, { x: 12, z: 26 }).size).toBe(model.size.width * model.size.depth);
  });

  it('shouldHaveAFullKitchenAndAFurnishedHouse', () => {
    const keys = keysOf(model);
    for (const key of ['kay-fogao', 'kay-forno', 'kay-geladeira', 'kay-pia', 'kay-cama-casal'])
      expect(keys).toContain(key);
    expect(keys.filter((key) => key === 'kay-mesa-redonda')).toHaveLength(6);
  });
});

describe('base ares', () => {
  const { model } = readyMap('base-ares')!.build();

  it('shouldBeABigMap', () => {
    expect(model.size).toEqual({ width: 64, depth: 64 });
  });

  it('shouldHaveTheModulesTunnelsAndLandingPads', () => {
    const keys = keysOf(model);
    const modules = keys.filter(
      (key) => key.startsWith('kay-modulo-') && key !== 'kay-modulo-pouso',
    );
    expect(modules).toHaveLength(7);
    expect(keys.filter((key) => key === 'kay-tunel')).toHaveLength(4);
    expect(keys.filter((key) => key === 'kay-plataforma-pouso')).toHaveLength(2);
    expect(keys).toContain('kay-hangar');
  });
});
