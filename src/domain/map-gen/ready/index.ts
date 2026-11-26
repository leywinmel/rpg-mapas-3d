/**
 * Biblioteca de mapas prontos (RPG-63): mapas pensados e montados à mão, casa por casa, sem
 * sorteio. O mestre escolhe um, dá um nome e o mapa abre pronto para jogar ou editar.
 */
import type { GridSize } from '../../grid';
import type { AssembledMap } from '../assemble';
import { AURORA_AVENUE_SIZE, buildAuroraAvenueMap } from './aurora-avenue';
import { buildCaveMap, CAVE_SIZE } from './cave';
import { buildChromeDocksMap, CHROME_DOCKS_SIZE } from './chrome-docks';
import { buildCryptMap, CRYPT_SIZE } from './crypt';
import { buildDesertMap, DESERT_SIZE } from './desert';
import { buildForestMap, FOREST_SIZE } from './forest';
import { buildGasStationMap, GAS_STATION_SIZE } from './gas-station';
import { buildGraveyardMap, GRAVEYARD_SIZE } from './graveyard';
import { buildHauntedVillageMap, HAUNTED_VILLAGE_SIZE } from './haunted-village';
import { buildHospitalMap, HOSPITAL_SIZE } from './hospital';
import { buildIslandMap, ISLAND_SIZE } from './island';
import { buildKingdomMap, KINGDOM_SIZE } from './kingdom';
import { buildMarsBaseMap, MARS_BASE_SIZE } from './mars-base';
import { buildMedievalTownMap, MEDIEVAL_TOWN_SIZE } from './medieval-town';
import { buildMetropolisMap, METROPOLIS_SIZE } from './metropolis';
import { buildCityCenterMap, CITY_CENTER_SIZE } from './city-center';
import { buildColonyMap, COLONY_SIZE } from './colony';
import { buildCornerBistroMap, CORNER_BISTRO_SIZE } from './corner-bistro';
import { buildModernTownMap, MODERN_TOWN_SIZE } from './modern-town';
import { buildNeonDistrictMap, NEON_DISTRICT_SIZE } from './neon-district';
import { buildIronDepthsMap, IRON_DEPTHS_SIZE } from './iron-depths';
import { buildNewHopeMap, NEW_HOPE_SIZE } from './new-hope';
import { buildSakuragawaMap, SAKURAGAWA_SIZE } from './sakuragawa';
import { buildGoldenValeMap, GOLDEN_VALE_SIZE } from './golden-vale';
import { buildCorsairCoveMap, CORSAIR_COVE_SIZE } from './corsair-cove';
import { buildGoldenSandsMap, GOLDEN_SANDS_SIZE } from './golden-sands';
import { buildOssuaryMap, OSSUARY_SIZE } from './ossuary';
import { buildLotharielMap, LOTHARIEL_SIZE } from './lothariel';
import { buildSkullIslandMap, SKULL_ISLAND_SIZE } from './skull-island';
import { buildDwarfHoldMap, DWARF_HOLD_SIZE } from './dwarf-hold';
import { buildOrcCampMap, ORC_CAMP_SIZE } from './orc-camp';
import { buildGothicTownMap, GOTHIC_TOWN_SIZE } from './gothic-town';
import { buildHarvestVillageMap, HARVEST_VILLAGE_SIZE } from './harvest-village';
import { buildTournamentMap, TOURNAMENT_SIZE } from './tournament';
import { buildWitchSwampMap, WITCH_SWAMP_SIZE } from './witch-swamp';
import { buildDesertOasisMap, DESERT_OASIS_SIZE } from './desert-oasis';
import { buildHrafnvikMap, HRAFNVIK_SIZE } from './hrafnvik';
import { buildPortMap, PORT_SIZE } from './port';
import { buildSchoolMap, SCHOOL_SIZE } from './school';
import { buildSiegeMap, SIEGE_SIZE } from './siege';
import { buildShipMap, SHIP_SIZE } from './ship';
import { buildStationMap, STATION_SIZE } from './station';
import { buildTavernMap, TAVERN_SIZE } from './tavern';
import { buildTwoCrownsMap, TWO_CROWNS_SIZE } from './two-crowns';
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
    id: 'reino-valdouro',
    name: 'Reino de Valdouro',
    description:
      'Um reino inteiro, 80×80: o castelo com quartel, campo de arqueiros e quatro torres; a vila com mercado, igreja, taverna e ferraria; o rio com a ponte de pedra e o moinho; trigais, serraria, a mina e o bosque.',
    size: KINGDOM_SIZE,
    build: buildKingdomMap,
  },
  {
    id: 'avenida-aurora',
    name: 'Avenida Aurora',
    description:
      'Centro de cidade grande, 64×64: duas avenidas com semáforos, quatro quarteirões de prédios, becos com caçambas, praça arborizada, estacionamento e uma perseguição policial no asfalto.',
    size: AURORA_AVENUE_SIZE,
    build: buildAuroraAvenueMap,
  },
  {
    id: 'metropole',
    name: 'Metrópole',
    description:
      'Centro de cidade grande, 120×96: quatro avenidas, oito quarteirões de prédios com becos e caçambas, o parque central com chafariz e estátuas, dois estacionamentos, o pátio da delegacia e uma batida no cruzamento.',
    size: METROPOLIS_SIZE,
    build: buildMetropolisMap,
  },
  {
    id: 'cerco-rubraforte',
    name: 'Cerco de Rubraforte',
    description:
      'Batalha inteira, 96×80: a fortaleza vermelha murada com castelo, quartel e portão, e ao sul o acampamento azul com tendas, paliçada e torres de catapulta. Montanhas, lago, aldeia queimada e bosques em volta.',
    size: SIEGE_SIZE,
    build: buildSiegeMap,
  },
  {
    id: 'vale-duas-coroas',
    name: 'Vale das Duas Coroas',
    description:
      'Campanha inteira, 128×112: o reino verde de Verdelar entre pinhais e o reino dourado de Auricampo com a mina de ouro, a praça neutra da feira na encruzilhada, o rio com três pontes, o acampamento dos viajantes e os trigais.',
    size: TWO_CROWNS_SIZE,
    build: buildTwoCrownsMap,
  },
  {
    id: 'vila-corvalha',
    name: 'Vila Assombrada de Corvalha',
    description:
      'Aldeia abandonada inteira, 96×88: o cemitério murado com mausoléus e cinco fileiras de túmulos, a igreja e a torre, a vila de casas em ruínas com o poço e a taverna, o pântano com a cabana da bruxa, o campo de abóboras e a mata morta.',
    size: HAUNTED_VILLAGE_SIZE,
    build: buildHauntedVillageMap,
  },
  {
    id: 'colonia-nova-esperanca',
    name: 'Colônia Nova Esperança',
    description:
      'Colônia inteira em Marte, 112×96: o núcleo com o comando, os domos, o laboratório e o alojamento; o campo solar, as turbinas, o campo de pouso com naves e hangar; as estufas, o depósito de carga e o garimpo com as perfuratrizes.',
    size: NEW_HOPE_SIZE,
    build: buildNewHopeMap,
  },
  {
    id: 'profundezas-ferro-negro',
    name: 'Profundezas de Ferro Negro',
    description:
      'Masmorra inteira, 80×72: a escadaria da superfície, o depósito e o alojamento dos guardas, o grande salão de banquetes, a prisão de celas gradeadas, o arsenal com o tesouro, a galeria das armadilhas e o covil com o altar e os sarcófagos.',
    size: IRON_DEPTHS_SIZE,
    build: buildIronDepthsMap,
  },
  {
    id: 'vila-sakuragawa',
    name: 'Vila de Sakuragawa',
    description:
      'Vila japonesa inteira, 96×80: o rio com a ponte de pedra, as casas de madeira das ruas de cima, o templo com o pagode, o campanário e o portal torii, o jardim do lago, o bambuzal, a rua do mercado e o dojo com os bonecos de treino.',
    size: SAKURAGAWA_SIZE,
    build: buildSakuragawaMap,
  },
  {
    id: 'fazenda-vale-dourado',
    name: 'Fazenda do Vale Dourado',
    description:
      'Campo inteiro, 104×88: a sede, o celeiro e o terreiro com o poço; os trigais cercados e a horta de abóboras; o pasto, o pomar, o lago e o povoado com a ferraria; do outro lado do rio, o moinho de vento, a serraria, o moinho d’água e o bosque.',
    size: GOLDEN_VALE_SIZE,
    build: buildGoldenValeMap,
  },
  {
    id: 'enseada-corsario',
    name: 'Enseada do Corsário',
    description:
      'Refúgio pirata inteiro, 104×88: a doca com o navio atracado entre os píeres e mais dois ao largo, o cais, a vila com a taverna e o armazém, a ruína velha, o forte de pedra com a torre e os canhões, o acampamento na praia e o tesouro enterrado.',
    size: CORSAIR_COVE_SIZE,
    build: buildCorsairCoveMap,
  },
  {
    id: 'fiorde-hrafnvik',
    name: 'Fiorde de Hrafnvik',
    description:
      'Vila nórdica no inverno, 104×88, toda coberta de neve: o fiorde com o barco longo do jarl entre os píeres, a fortaleza de paliçada com o grande salão e a torre de vigia, a vila com a ferraria e o armazém do cais, o acampamento dos caçadores, o círculo de pedras rúnicas, o lago congelado e as montanhas.',
    size: HRAFNVIK_SIZE,
    build: buildHrafnvikMap,
  },
  {
    id: 'porto-areias-douradas',
    name: 'Porto das Areias Douradas',
    description:
      'Cidade portuária no deserto, 104×88: a doca com o navio mercante entre os píeres, a avenida de pedra até o obelisco, o bazar com seis bancas cobertas e o poço, o palácio murado do sultão com o salão, as torres e o jardim da fonte, o oásis com o lago e as palmeiras, o acampamento da caravana e a ruína velha.',
    size: GOLDEN_SANDS_SIZE,
    build: buildGoldenSandsMap,
  },
  {
    id: 'catacumbas-ossario',
    name: 'Catacumbas do Ossário',
    description:
      'Masmorra gigante, 104×88: a escadaria da entrada, a capela dos ossos com pilares e sarcófagos, as galerias do ossário cheias de crânios, os túmulos dos nobres, o salão das armadilhas, os aposentos dos sacerdotes, a cripta do tesouro e o covil do lich entre dois lagos negros.',
    size: OSSUARY_SIZE,
    build: buildOssuaryMap,
  },
  {
    id: 'bosque-lothariel',
    name: 'Bosque de Lothariel',
    description:
      'Cidade élfica na floresta, 104×88: o salão da rainha com o pátio, a fonte e as torres, a praça do conselho com o mercado, as casas dos elfos, o bairro dos guardiões com a torre de vigia, o lago da lua com a ilha da estátua e o moinho d’água, o bosque sagrado dos druidas e a mata fechada em volta.',
    size: LOTHARIEL_SIZE,
    build: buildLotharielMap,
  },
  {
    id: 'ilha-caveira',
    name: 'Ilha da Caveira',
    description:
      'Ilha pirata, 104×88, com o mar em volta: a enseada com o navio atracado no píer, a vila pirata com a taverna e a fogueira, o forte murado com as torres e os canhões, a selva fechada com a ruína da caveira e o tesouro, e o acampamento dos náufragos na praia leste.',
    size: SKULL_ISLAND_SIZE,
    build: buildSkullIslandMap,
  },
  {
    id: 'fortaleza-khazdur',
    name: 'Fortaleza de Khazdur',
    description:
      'Cidade anã escavada na montanha, 104×88: o salão do rei no pátio murado, o bairro das forjas, as casas dos clãs, a praça do mercado, a ponte de pedra sobre o abismo, as minas com os túneis e o lago subterrâneo com o quartel da guarda.',
    size: DWARF_HOLD_SIZE,
    build: buildDwarfHoldMap,
  },
  {
    id: 'fortim-grukmar',
    name: 'Fortim de Grukmar',
    description:
      'Acampamento de guerra orc, 104×88: a paliçada com o salão do chefe, as casas compridas, as tendas, a arena e a forja; fora dela, as montanhas, a mata seca, as catapultas, a ruína saqueada e a ponte sobre o rio até o posto dos batedores.',
    size: ORC_CAMP_SIZE,
    build: buildOrcCampMap,
  },
  {
    id: 'burgo-morvane',
    name: 'Burgo de Morvane',
    description:
      'Cidade gótica do conde vampiro, 104×88: o castelo no pátio murado, a catedral com a torre do sino, o bairro velho, o rio com duas pontes, a praça do cadafalso com o mercado noturno, as vielas do sul, o cemitério cercado de ferro com os mausoléus e a muralha com o portão.',
    size: GOTHIC_TOWN_SIZE,
    build: buildGothicTownMap,
  },
  {
    id: 'aldeia-ribeira-clara',
    name: 'Aldeia de Ribeira Clara',
    description:
      'Aldeia de lavradores na colheita, 104×88: a ponte de pedra sobre o ribeirão, o moinho d’água, o pomar, os trigais com os moinhos de vento, a praça da feira com o poço, a capela, as hortas, a serraria, o pasto cercado e o celeiro grande com o terreiro.',
    size: HARVEST_VILLAGE_SIZE,
    build: buildHarvestVillageMap,
  },
  {
    id: 'torneio-altamira',
    name: 'Torneio de Altamira',
    description:
      'Campo de um torneio de cavaleiros, 104×88: a liça de areia com a barreira da justa, as arquibancadas, o pavilhão do rei com o banquete, o acampamento dos cavaleiros com as tendas e as bandeiras, o campo de arqueiros e os quartéis ao pé do castelo, a feira com as barracas e a taverna, e o povoado.',
    size: TOURNAMENT_SIZE,
    build: buildTournamentMap,
  },
  {
    id: 'pantano-lodoverde',
    name: 'Pântano de Lodoverde',
    description:
      'Brejo da bruxa, 104×88: dois canais em cruz com quatro pontes de madeira, os poços fundos, a cabana da bruxa com a fogueira e os ossos, a aldeia dos pescadores, as casas da margem norte, a ruína afundada no lodo com as covas, as árvores secas, as pedras e os botes.',
    size: WITCH_SWAMP_SIZE,
    build: buildWitchSwampMap,
  },
  {
    id: 'oasis-zahrim',
    name: 'Oásis de Zahrim',
    description:
      'Parada de caravanas no deserto, 104×88: o lago do oásis com o anel de palmeiras, o caravançará murado com o poço e as tendas, o mercado de tendas, a estrada com as casas de barro do povoado, as dunas e a ruína antiga com a estátua e os obeliscos.',
    size: DESERT_OASIS_SIZE,
    build: buildDesertOasisMap,
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
