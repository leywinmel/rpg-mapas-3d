import { describe, expect, it } from 'vitest';
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
import { islandFloors } from './island';
import { medievalTownFloors } from './medieval-town';
import { modernTownFloors } from './modern-town';
import { neonDistrictFloors } from './neon-district';
import { portFloors } from './port';
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
