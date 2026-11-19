/**
 * Biblioteca de mapas prontos (RPG-63): mapas pensados e montados à mão, casa por casa, sem
 * sorteio. O mestre escolhe um, dá um nome e o mapa abre pronto para jogar ou editar.
 */
import type { GridSize } from '../../grid';
import type { AssembledMap } from '../assemble';
import { buildCaveMap, CAVE_SIZE } from './cave';
import { buildChromeDocksMap, CHROME_DOCKS_SIZE } from './chrome-docks';
import { buildCryptMap, CRYPT_SIZE } from './crypt';
import { buildDesertMap, DESERT_SIZE } from './desert';
import { buildIslandMap, ISLAND_SIZE } from './island';
import { buildMedievalTownMap, MEDIEVAL_TOWN_SIZE } from './medieval-town';
import { buildCityCenterMap, CITY_CENTER_SIZE } from './city-center';
import { buildColonyMap, COLONY_SIZE } from './colony';
import { buildModernTownMap, MODERN_TOWN_SIZE } from './modern-town';
import { buildNeonDistrictMap, NEON_DISTRICT_SIZE } from './neon-district';
import { buildPortMap, PORT_SIZE } from './port';
import { buildShipMap, SHIP_SIZE } from './ship';
import { buildStationMap, STATION_SIZE } from './station';
import { buildWalledTownMap, WALLED_TOWN_SIZE } from './walled-town';

export type ReadyMap = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly size: GridSize;
  /** Monta o mapa; `dropped` diz quantas peças não couberam (zero num mapa bem feito). */
  readonly build: () => AssembledMap;
};

export const READY_MAPS: readonly ReadyMap[] = [
  {
    id: 'navio',
    name: 'Navio de guerra',
    description:
      'Um navio inteiro no mar: porão com redes e cela, convés com canhões e mastros, cabine do capitão e tombadilho com o timão.',
    size: SHIP_SIZE,
    build: buildShipMap,
  },
  {
    id: 'cripta',
    name: 'Cripta esquecida',
    description:
      'Masmorra que desce em degraus: salão de pilares, prisão com celas, sala do altar e a cripta funda dos sarcófagos, com uma sala secreta.',
    size: CRYPT_SIZE,
    build: buildCryptMap,
  },
  {
    id: 'caverna',
    name: 'Caverna dos ecos',
    description:
      'Gruta em degraus: salão de estalagmites, lago subterrâneo com bote, acampamento de saqueadores no patamar alto e a gruta dos cristais que brilham.',
    size: CAVE_SIZE,
    build: buildCaveMap,
  },
  {
    id: 'deserto',
    name: 'Areias do sol',
    description:
      'Dunas em degraus com um oásis de palmeiras, as ruínas de um templo no platô, a caravana acampada e um rochedo com mirante.',
    size: DESERT_SIZE,
    build: buildDesertMap,
  },
  {
    id: 'porto',
    name: 'Porto da maré',
    description:
      'Cidade na encosta que desce até o mar: armazém, taverna, mercado de peixe, três píeres com navio e barcos, e o farol no pontal.',
    size: PORT_SIZE,
    build: buildPortMap,
  },
  {
    id: 'vila-ponte',
    name: 'Vila da Ponte Velha',
    description:
      'Vila medieval em degraus: o rio com a ponte e as roças, as casas da beira-rio, a praça da fonte com a taverna, a igreja no patamar e a torre do senhor no morro murado.',
    size: MEDIEVAL_TOWN_SIZE,
    build: buildMedievalTownMap,
  },
  {
    id: 'burgo-monte',
    name: 'Burgo do Monte Alto',
    description:
      'Cidade murada que sobe a encosta em degraus: roças e lago fora do muro, praça do mercado, ruas de casas e lojas, a igreja no patamar e o castelo no topo, sobre o penhasco.',
    size: WALLED_TOWN_SIZE,
    build: buildWalledTownMap,
  },
  {
    id: 'bairro-orla',
    name: 'Bairro da Orla',
    description:
      'Bairro moderno na encosta do lago: praia com píer e coqueiros, avenida da orla, parque da fonte, mercado com estacionamento e duas ruas de casas com quintal.',
    size: MODERN_TOWN_SIZE,
    build: buildModernTownMap,
  },
  {
    id: 'centro-cidade',
    name: 'Centro da Cidade',
    description:
      'Miolo de cidade moderna: duas avenidas que se cruzam, torres de escritório, praça cívica elevada com a estátua, lojas e beco, quartel dos bombeiros e pátio da polícia.',
    size: CITY_CENTER_SIZE,
    build: buildCityCenterMap,
  },
  {
    id: 'colonia-astra',
    name: 'Colônia Astra',
    description:
      'Posto avançado futurista em três conveses: torres de habitação e a praça do terminal no alto, avenida com lojas e garagens no meio, pátio de carga e pista de kart embaixo.',
    size: COLONY_SIZE,
    build: buildColonyMap,
  },
  {
    id: 'estacao-vega',
    name: 'Estação Vega',
    description:
      'Estação espacial por dentro: ponte de comando com o estrado do capitão, mirante, alojamentos, refeitório, laboratório, o reator com o poço do núcleo e o hangar das naves.',
    size: STATION_SIZE,
    build: buildStationMap,
  },
  {
    id: 'distrito-neon',
    name: 'Distrito Neon',
    description:
      'Bairro cyberpunk à noite: rua dos letreiros com lojas e torres, mercado noturno de barracas, praça do holograma um degrau acima e o canal sujo com a ponte da avenida.',
    size: NEON_DISTRICT_SIZE,
    build: buildNeonDistrictMap,
  },
  {
    id: 'cais-cromo',
    name: 'Cais Cromo',
    description:
      'Porto industrial cyberpunk: o beco das agulhas entre megaprédios, a boate com estacionamento, o armazém, o pátio de contêineres com a plataforma do guindaste e dois píeres sobre o mar escuro.',
    size: CHROME_DOCKS_SIZE,
    build: buildChromeDocksMap,
  },
  {
    id: 'ilha-vulcao',
    name: 'Ilha do Vulcão',
    description:
      'Ilha gigante cercada de mar: praia, baixada verde, morros de mata subindo em degraus até o cume do vulcão com o ídolo, vila de pescadores com píer, ruínas do templo e acampamento pirata.',
    size: ISLAND_SIZE,
    build: buildIslandMap,
  },
];

export function readyMap(id: string): ReadyMap | undefined {
  return READY_MAPS.find((map) => map.id === id);
}

export { createSketch, outlineWalls, type Sketch, type WallBand } from './sketch';
