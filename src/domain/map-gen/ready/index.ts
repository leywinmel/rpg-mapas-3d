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
import { buildForestMap, FOREST_SIZE } from './forest';
import { buildGasStationMap, GAS_STATION_SIZE } from './gas-station';
import { buildGraveyardMap, GRAVEYARD_SIZE } from './graveyard';
import { buildHospitalMap, HOSPITAL_SIZE } from './hospital';
import { buildIslandMap, ISLAND_SIZE } from './island';
import { buildMarsBaseMap, MARS_BASE_SIZE } from './mars-base';
import { buildMedievalTownMap, MEDIEVAL_TOWN_SIZE } from './medieval-town';
import { buildCityCenterMap, CITY_CENTER_SIZE } from './city-center';
import { buildColonyMap, COLONY_SIZE } from './colony';
import { buildCornerBistroMap, CORNER_BISTRO_SIZE } from './corner-bistro';
import { buildModernTownMap, MODERN_TOWN_SIZE } from './modern-town';
import { buildNeonDistrictMap, NEON_DISTRICT_SIZE } from './neon-district';
import { buildPortMap, PORT_SIZE } from './port';
import { buildSchoolMap, SCHOOL_SIZE } from './school';
import { buildShipMap, SHIP_SIZE } from './ship';
import { buildStationMap, STATION_SIZE } from './station';
import { buildTavernMap, TAVERN_SIZE } from './tavern';
import { buildTempleSchoolMap, TEMPLE_SCHOOL_SIZE } from './temple-school';
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
    id: 'bosque-sombras',
    name: 'Bosque das Sombras',
    description:
      'Floresta fechada cortada por uma trilha: a ponte sobre o riacho, o círculo de pedras com o altar, o acampamento dos salteadores, a cabana da bruxa no lamaçal e o anel de cogumelos.',
    size: FOREST_SIZE,
    build: buildForestMap,
  },
  {
    id: 'taverna-javali',
    name: 'Taverna do Javali',
    description:
      'Estalagem de beira de estrada: o salão com o balcão de chope, mesas e o banquete, a cozinha com a despensa, dois quartos de hóspede e a rua com o chafariz.',
    size: TAVERN_SIZE,
    build: buildTavernMap,
  },
  {
    id: 'cemiterio-colina',
    name: 'Cemitério da Colina',
    description:
      'Cemitério cercado de grade de ferro: a alameda de lanternas até o mausoléu, quatro quadras de túmulos, a cova violada, a cabana do coveiro com os caixões e a horta de abóboras.',
    size: GRAVEYARD_SIZE,
    build: buildGraveyardMap,
  },
  {
    id: 'restaurante-esquina',
    name: 'Restaurante da Esquina',
    description:
      'Quarteirão moderno: restaurante com salão, bar e cozinha completa, a casa do vizinho com sala, cozinha americana e dois quartos, e a rua com carros parados.',
    size: CORNER_BISTRO_SIZE,
    build: buildCornerBistroMap,
  },
  {
    id: 'base-ares',
    name: 'Base Ares (Marte)',
    description:
      'Colônia grande num planeta vermelho: módulos ligados por túneis, hangar, laboratório e alojamentos, mineração, painéis solares, turbinas, pátio de carga e duas plataformas de pouso.',
    size: MARS_BASE_SIZE,
    build: buildMarsBaseMap,
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
  {
    id: 'academia-kasumi',
    name: 'Academia do Monte Kasumi',
    description:
      'Escola-templo japonesa na encosta: torii e lago no pé do monte, campo de treino e salas de aula, pátio do incensário entre os dormitórios e, no alto, o salão principal, o pagode e o bambuzal.',
    size: TEMPLE_SCHOOL_SIZE,
    build: buildTempleSchoolMap,
  },
  {
    id: 'escola-bairro-alto',
    name: 'Escola do Bairro Alto',
    description:
      'Escola inteira cercada, de frente para a avenida: pavilhões de dois andares com as salas de aula montadas, refeitório, campo de futebol com pista, quadra de basquete, enfermaria, secretaria na praça do mastro e estacionamento.',
    size: SCHOOL_SIZE,
    build: buildSchoolMap,
  },
  {
    id: 'hospital-central',
    name: 'Hospital Central',
    description:
      'Complexo hospitalar gigante: alas de internação de cinco andares com as enfermarias montadas, torre principal com recepção, pronto-socorro com a baía das ambulâncias, heliponto, parque com lago e estacionamentos lotados.',
    size: HOSPITAL_SIZE,
    build: buildHospitalMap,
  },
  {
    id: 'posto-rodovia',
    name: 'Posto da Rodovia',
    description:
      'Posto de gasolina na beira da estrada: duas coberturas sobre oito bombas, carros abastecendo, totem de preços, loja de conveniência com o mercadinho montado, oficina e a carreta parada no canto.',
    size: GAS_STATION_SIZE,
    build: buildGasStationMap,
  },
];

export function readyMap(id: string): ReadyMap | undefined {
  return READY_MAPS.find((map) => map.id === id);
}

export { createSketch, outlineWalls, type Sketch, type WallBand } from './sketch';
