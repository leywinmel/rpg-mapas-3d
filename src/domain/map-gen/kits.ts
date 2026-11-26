/**
 * Peças de cada estilo que o gerador e as casas prontas usam. São só chaves do catálogo
 * (src/features/scene/catalog): o domínio não conhece o catálogo, e um teste do lado da cena
 * confere que cada chave existe, é do tipo certo e tem o tamanho em casas que está aqui [#30].
 */
import type { Backdrop } from '../map-document';
import { createDefaultHeader, type Footprint, type MapHeader } from '../map-v2';
import type { Interior } from './interiors';

export type SettlementStyle = 'medieval' | 'modern' | 'futurist' | 'cyberpunk';

export const SETTLEMENT_STYLES: readonly SettlementStyle[] = [
  'medieval',
  'modern',
  'futurist',
  'cyberpunk',
];

/** Nome de cada estilo na tela. */
export const SETTLEMENT_STYLE_LABELS: Readonly<Record<SettlementStyle, string>> = {
  medieval: 'Medieval',
  modern: 'Moderno',
  // O futurista de metal limpo virou "sci-fi" quando o cyberpunk de neon chegou (RPG-42).
  futurist: 'Sci-fi',
  cyberpunk: 'Cyberpunk',
};

/** As três paredes de um prédio: lisa, com porta e com janela (cada uma cobre um andar). */
export type WallSet = {
  readonly plain: string;
  readonly door: string;
  readonly window: string;
  /** Fachada de loja no térreo (vitrine); sem ela, a loja usa janelas. */
  readonly shopfront?: string;
  /**
   * Telhados de duas águas desta casa, do maior para o menor: a casa de reboco do moderno tem
   * telhado mesmo num estilo de laje. Sem eles, vale o telhado do estilo.
   */
  readonly roofs?: readonly SizedPiece[];
};

/** Peça com tamanho em casas (antes de girar). */
export type SizedPiece = { readonly key: string; readonly footprint: Footprint };

export type RoofKind = 'gable' | 'flat';

export type StyleKit = {
  /** Cômodos de uso próprio que a cidade do estilo ganha de vez em quando (escola, hospital). */
  readonly interiors: readonly Interior[];
  readonly tiles: {
    /** Chão de fora das ruas (grama, placas). */
    readonly ground: string;
    readonly road: string;
    /** Rua de terra da vila (estrada do campo); o resto usa `road`. */
    readonly lane: string;
    /** Calçada em volta dos quarteirões; nulo = sem calçada (vila medieval). */
    readonly sidewalk: string | null;
    readonly plaza: string;
    /** Pisos internos: cada prédio sorteia um. */
    readonly indoor: readonly string[];
    readonly yard: string;
  };
  readonly walls: {
    readonly house: readonly WallSet[];
    readonly tower: readonly WallSet[];
    readonly shop: readonly WallSet[];
  };
  readonly roof: RoofKind;
  /** Paisagem em volta do mapa gerado (RPG-40). */
  readonly backdrop: Backdrop;
  /** Clima da cena (chave do clima pronto) e a cor da neblina que combina com ele. */
  readonly climate: { readonly preset: string; readonly fogColor: string; readonly light: number };
  /** Telhados de duas águas, do maior para o menor (só no estilo com `roof: 'gable'`). */
  readonly gableRoofs: readonly SizedPiece[];
  /** Escada interna de um andar (1×3). */
  readonly stairs: SizedPiece;
  /** Veículos estacionados nas faixas da rua (largura 2). */
  readonly vehicles: readonly SizedPiece[];
  /** Veículos grandes (largura 3), só nas avenidas. */
  readonly bigVehicles: readonly SizedPiece[];
  /** Mobília de casa e de prédio, encostada nas paredes. */
  readonly indoorProps: readonly string[];
  /** Mobília de loja (balcão, prateleira): o térreo do prédio de uso `shop`. */
  readonly shopProps: readonly string[];
  readonly rooftopProps: readonly string[];
  readonly streetProps: readonly string[];
  /** Poste ou tocha ao longo da rua; nulo = o estilo não tem. */
  readonly lamp: string | null;
  readonly plazaCenter: string;
  /** Monumentos da praça (fonte, estátua), do maior para o menor: entra o maior que couber. */
  readonly plazaMonuments: readonly SizedPiece[];
  /** Banco dos caminhos da praça. */
  readonly plazaBench: string;
  readonly trees: readonly string[];
  readonly yardProps: readonly string[];
  /** Plantinhas e pedrinhas soltas no gramado (capim, flores, folhas): o chão não fica liso. */
  readonly groundCover: readonly string[];
  /** Cerca dos quintais da vila; nulo = sem cerca. */
  readonly fence: string | null;
};

const ONE: Footprint = { width: 1, depth: 1 };
const CAR: Footprint = { width: 2, depth: 3 };
const TRUCK: Footprint = { width: 3, depth: 6 };
/** Carros realistas do moderno (RPG-50): em rua de 4 casas, só uma mão tem vaga para eles. */
const REAL_CAR: Footprint = { width: 3, depth: 5 };
const REAL_VAN: Footprint = { width: 3, depth: 6 };
const REAL_TRUCK: Footprint = { width: 3, depth: 8 };
const FOUNTAIN: SizedPiece = { key: 'pra-fonte', footprint: { width: 3, depth: 3 } };
const SMALL_FOUNTAIN: SizedPiece = { key: 'pra-chafariz', footprint: { width: 2, depth: 2 } };
const HERO_STATUE: SizedPiece = { key: 'pra-estatua-grande', footprint: { width: 2, depth: 2 } };
const OBELISK: SizedPiece = { key: 'pra-obelisco', footprint: ONE };
/** Canteiro elevado dos jardins de praça: o mesmo em todo estilo. */
export const GARDEN_BED: SizedPiece = { key: 'pra-canteiro', footprint: { width: 2, depth: 1 } };
const INNER_STAIRS: SizedPiece = { key: 'med-escada-interna', footprint: { width: 1, depth: 3 } };

/** Telhados de duas águas do moderno (RPG-52), do maior para o menor. */
const modernRoofs = (material: string): SizedPiece[] => [
  { key: `mod-telhado-${material}-4x4`, footprint: { width: 4, depth: 4 } },
  { key: `mod-telhado-${material}-2x4`, footprint: { width: 2, depth: 4 } },
  { key: `mod-telhado-${material}-2x2`, footprint: { width: 2, depth: 2 } },
];
const SLATE_ROOFS = modernRoofs('ardosia');
const CLAY_ROOFS = modernRoofs('barro');

/** Casa de bairro: parede, janela e porta no mesmo reboco, com telhado de duas águas. */
const plasterHouse = (color: string, roofs: readonly SizedPiece[]): WallSet => ({
  plain: `mod-reboco-${color}`,
  door: `mod-reboco-${color}-porta`,
  window: `mod-reboco-${color}-janela`,
  roofs,
});

export const SINGLE_CELL = ONE;

/**
 * Peças soltas maiores que uma casa, na escala do boneco (RPG-66): sofá, rack com TV e bancos
 * de três lugares têm 2×1; a cama, 1×2. O catálogo da cena repete a medida para desenhar; um
 * teste garante que os dois batem.
 */
export const PROP_FOOTPRINTS: Readonly<Record<string, Footprint>> = {
  'mod-sofa': { width: 2, depth: 1 },
  'mod-tv': { width: 2, depth: 1 },
  'mod-cama': { width: 1, depth: 2 },
  'mod-banco-praca': { width: 2, depth: 1 },
  'pra-banco-pedra': { width: 2, depth: 1 },
  'nav-rede': { width: 1, depth: 2 },
  'med-escada-interna': { width: 1, depth: 3 },
  'mas-sarcofago': { width: 1, depth: 2 },
  'mas-altar': { width: 2, depth: 1 },
  'nat-pedregulho': { width: 2, depth: 2 },
  'nat-tronco': { width: 2, depth: 1 },
  'med-bote': { width: 1, depth: 2 },
  'pra-estatua-grande': { width: 2, depth: 2 },
  'med-carroca': { width: 2, depth: 3 },
  'med-navio': { width: 4, depth: 10 },
  'med-pesqueiro': { width: 2, depth: 4 },
  'pra-fonte': { width: 3, depth: 3 },
  'pra-canteiro': { width: 2, depth: 1 },
  'jap-torii': { width: 3, depth: 1 },
  'jap-pagode': { width: 3, depth: 3 },
  'jap-campanario': { width: 2, depth: 2 },
  'esc-mesa-professor': { width: 2, depth: 1 },
  'esc-lousa': { width: 2, depth: 1 },
  'esc-trave': { width: 3, depth: 1 },
  'hos-leito': { width: 1, depth: 2 },
  'hos-maca': { width: 1, depth: 2 },
  'hos-balcao': { width: 2, depth: 1 },
  'hos-heliponto': { width: 4, depth: 4 },
  'pos-cobertura': { width: 12, depth: 8 },
  'kay-cama': { width: 2, depth: 2 },
  'kay-cama-palha': { width: 1, depth: 2 },
  'kay-barril-chope': { width: 2, depth: 1 },
  'kay-mesa-banquete': { width: 2, depth: 3 },
  'kay-estandarte-azul': { width: 2, depth: 1 },
  'kay-espada-escudo': { width: 2, depth: 1 },
  // KayKit Bits (RPG-70): casa, cemitério, cozinha e base espacial.
  'kay-sofa': { width: 2, depth: 1 },
  'kay-cama-casal': { width: 2, depth: 2 },
  'kay-cama-solteiro': { width: 1, depth: 2 },
  'kay-comoda': { width: 2, depth: 1 },
  'kay-mesa-comprida': { width: 2, depth: 1 },
  'kay-mesa-centro': { width: 2, depth: 1 },
  'kay-tapete-listrado': { width: 2, depth: 1 },
  'kay-tapete-oval': { width: 2, depth: 1 },
  'kay-caixao': { width: 1, depth: 2 },
  'kay-caixao-ornado': { width: 1, depth: 2 },
  'kay-mausoleu': { width: 3, depth: 4 },
  'kay-portao-cemiterio': { width: 2, depth: 1 },
  'kay-grade-ferro': { width: 2, depth: 1 },
  'kay-grade-quebrada': { width: 2, depth: 1 },
  'kay-pinheiro-outono': { width: 3, depth: 2 },
  'kay-fogao': { width: 2, depth: 2 },
  'kay-forno': { width: 1, depth: 2 },
  'kay-geladeira': { width: 1, depth: 2 },
  'kay-pia': { width: 1, depth: 2 },
  'kay-bancada': { width: 2, depth: 2 },
  'kay-bancada-lisa': { width: 1, depth: 2 },
  'kay-mesa-redonda': { width: 2, depth: 2 },
  'kay-mesa-cozinha': { width: 2, depth: 1 },
  'kay-modulo-base': { width: 6, depth: 6 },
  'kay-modulo-domo': { width: 6, depth: 6 },
  'kay-modulo-laboratorio': { width: 5, depth: 6 },
  'kay-modulo-alojamento': { width: 7, depth: 6 },
  'kay-modulo-comando': { width: 6, depth: 6 },
  'kay-hangar': { width: 5, depth: 6 },
  'kay-carga': { width: 3, depth: 3 },
  'kay-carga-embalada': { width: 2, depth: 2 },
  'kay-deposito-carga': { width: 6, depth: 6 },
  'kay-perfuratriz': { width: 5, depth: 5 },
  'kay-modulo-pouso': { width: 4, depth: 4 },
  'kay-plataforma-pouso': { width: 7, depth: 7 },
  'kay-painel-solar': { width: 3, depth: 1 },
  'kay-turbina-eolica': { width: 5, depth: 3 },
  'kay-jipe-espacial': { width: 1, depth: 3 },
  'kay-caminhao-espacial': { width: 2, depth: 3 },
  'kay-torre-antena': { width: 5, depth: 5 },
  'kay-holofotes': { width: 2, depth: 2 },
  'kay-rocha-marte': { width: 2, depth: 1 },
  'kay-rochas-marte': { width: 4, depth: 4 },
  'kay-tunel': { width: 5, depth: 3 },
  // KayKit City Builder Bits e Medieval Hexagon (RPG-72): prédios, carros e a vila medieval.
  'kay-predio-a': { width: 6, depth: 7 },
  'kay-predio-b': { width: 8, depth: 7 },
  'kay-predio-c': { width: 6, depth: 7 },
  'kay-predio-d': { width: 8, depth: 7 },
  'kay-predio-e': { width: 10, depth: 7 },
  'kay-predio-f': { width: 10, depth: 7 },
  'kay-predio-g': { width: 10, depth: 7 },
  'kay-predio-h': { width: 10, depth: 7 },
  'kay-viatura': { width: 2, depth: 5 },
  'kay-sedan': { width: 2, depth: 5 },
  'kay-hatch': { width: 2, depth: 4 },
  'kay-perua': { width: 2, depth: 5 },
  'kay-cacamba': { width: 3, depth: 2 },
  'kay-poste-rua': { width: 2, depth: 1 },
  'kay-semaforo-duplo': { width: 2, depth: 1 },
  'kay-caixa-dagua': { width: 3, depth: 3 },
  'kay-banco-rua': { width: 2, depth: 1 },
  'kay-castelo': { width: 10, depth: 11 },
  'kay-igreja': { width: 5, depth: 6 },
  'kay-taverna': { width: 6, depth: 7 },
  'kay-moinho-vento': { width: 6, depth: 4 },
  'kay-moinho-agua': { width: 5, depth: 6 },
  'kay-ferraria': { width: 7, depth: 6 },
  'kay-mercado': { width: 9, depth: 7 },
  'kay-quartel': { width: 7, depth: 8 },
  'kay-campo-arqueiros': { width: 9, depth: 8 },
  'kay-serraria': { width: 7, depth: 6 },
  'kay-mina': { width: 8, depth: 10 },
  'kay-torre-vigia': { width: 5, depth: 6 },
  'kay-torre-catapulta': { width: 5, depth: 7 },
  'kay-casa-a': { width: 4, depth: 4 },
  'kay-casa-b': { width: 5, depth: 6 },
  'kay-ponte-pedra': { width: 7, depth: 10 },
  'kay-ruina': { width: 8, depth: 7 },
  'kay-andaime': { width: 10, depth: 11 },
  'kay-trigal': { width: 10, depth: 11 },
  // Medieval Hexagon (RPG-73): muralhas, reino rival, adereços e natureza.
  'kay-poco': { width: 3, depth: 4 },
  'kay-torre-pedra': { width: 6, depth: 7 },
  'kay-ponte-b': { width: 7, depth: 10 },
  'kay-muralha': { width: 10, depth: 4 },
  'kay-muralha-portao': { width: 10, depth: 5 },
  'kay-muralha-canto': { width: 9, depth: 7 },
  'kay-muralha-canto-dentro': { width: 9, depth: 7 },
  'kay-cerca-pedra': { width: 1, depth: 6 },
  'kay-cerca-pedra-portao': { width: 1, depth: 6 },
  'kay-cerca-madeira': { width: 1, depth: 6 },
  'kay-cerca-madeira-portao': { width: 1, depth: 6 },
  'kay-castelo-vermelho': { width: 10, depth: 11 },
  'kay-quartel-vermelho': { width: 7, depth: 8 },
  'kay-campo-arqueiros-vermelho': { width: 9, depth: 8 },
  'kay-torre-vigia-vermelha': { width: 5, depth: 6 },
  'kay-torre-catapulta-vermelha': { width: 5, depth: 7 },
  'kay-igreja-vermelha': { width: 5, depth: 6 },
  'kay-taverna-vermelha': { width: 6, depth: 7 },
  'kay-casa-vermelha': { width: 4, depth: 4 },
  'kay-caixote-aberto': { width: 2, depth: 1 },
  'kay-caixote-longo': { width: 2, depth: 1 },
  'kay-bandeira-azul': { width: 1, depth: 2 },
  'kay-bandeira-vermelha': { width: 1, depth: 2 },
  'kay-bandeira-verde': { width: 1, depth: 2 },
  'kay-bandeira-amarela': { width: 1, depth: 2 },
  'kay-palete': { width: 2, depth: 2 },
  'kay-pilha-madeira': { width: 4, depth: 2 },
  'kay-pilha-pedras': { width: 2, depth: 2 },
  'kay-tenda': { width: 3, depth: 3 },
  'kay-carrinho-mao': { width: 1, depth: 3 },
  'kay-montanha-a': { width: 9, depth: 10 },
  'kay-montanha-b': { width: 9, depth: 10 },
  'kay-montanha-c': { width: 9, depth: 10 },
  'kay-montanha-verde': { width: 9, depth: 10 },
  'kay-montanha-verde-b': { width: 9, depth: 10 },
  'kay-colina-arvores': { width: 9, depth: 9 },
  'kay-colinas': { width: 8, depth: 8 },
  'kay-morro': { width: 6, depth: 4 },
  'kay-bosque-grande': { width: 10, depth: 10 },
  'kay-pinhal-grande': { width: 9, depth: 10 },
  'kay-bosque': { width: 9, depth: 9 },
  'kay-clareira-tocos': { width: 9, depth: 9 },
  'kay-arvore-vila': { width: 3, depth: 3 },
  'kay-pinheiro-vila': { width: 4, depth: 4 },
  'kay-pedra-a': { width: 2, depth: 2 },
  'kay-pedra-c': { width: 2, depth: 2 },
};

/** Footprint de uma peça solta (sem giro): o da tabela ou uma casa. */
export function propFootprint(key: string): Footprint {
  return PROP_FOOTPRINTS[key] ?? ONE;
}

const MEDIEVAL: StyleKit = {
  interiors: [],
  tiles: {
    ground: 'grama',
    road: 'med-calcamento',
    lane: 'terra',
    sidewalk: null,
    plaza: 'med-piso-tijolo-vermelho',
    indoor: ['med-assoalho-escuro', 'med-assoalho-claro'],
    yard: 'terra',
  },
  walls: {
    house: [
      { plain: 'med-parede-reboco', door: 'med-reboco-porta', window: 'med-reboco-janela' },
      { plain: 'med-parede-enxaimel', door: 'med-reboco-porta', window: 'med-reboco-janela' },
    ],
    tower: [
      { plain: 'med-parede-rustica', door: 'med-rustica-porta', window: 'med-rustica-janela' },
    ],
    shop: [{ plain: 'med-parede-enxaimel', door: 'med-arco', window: 'med-reboco-janela' }],
  },
  roof: 'gable',
  backdrop: 'village',
  climate: { preset: 'vila', fogColor: '#141009', light: 1 },
  gableRoofs: [
    { key: 'med-telhado-4x4', footprint: { width: 4, depth: 4 } },
    { key: 'med-telhado-2x4', footprint: { width: 2, depth: 4 } },
    { key: 'med-telhado-2x2', footprint: { width: 2, depth: 2 } },
  ],
  stairs: INNER_STAIRS,
  vehicles: [{ key: 'med-carroca', footprint: CAR }],
  bigVehicles: [],
  indoorProps: ['mesa', 'cadeira', 'bau', 'barril', 'med-caixote'],
  shopProps: ['mesa', 'barril', 'med-caixote', 'bau'],
  rooftopProps: [],
  streetProps: ['barril', 'med-caixote', 'caixa'],
  lamp: 'tocha',
  plazaCenter: 'estatua',
  plazaMonuments: [FOUNTAIN, HERO_STATUE, SMALL_FOUNTAIN],
  plazaBench: 'pra-banco-pedra',
  trees: ['arvore', 'nat-carvalho', 'nat-pinheiro', 'nat-betula'],
  yardProps: ['barril', 'med-caixote', 'rocha', 'nat-arbusto', 'nat-toco'],
  groundCover: ['nat-capim', 'nat-capim', 'nat-flores', 'nat-seixos', 'nat-folhas'],
  fence: 'med-cerca-madeira',
};

const MODERN: StyleKit = {
  interiors: ['classroom', 'ward', 'police', 'post', 'market'],
  tiles: {
    ground: 'grama',
    road: 'mod-asfalto',
    lane: 'mod-asfalto',
    sidewalk: 'mod-calcada',
    plaza: 'mod-calcada',
    indoor: ['mod-piso-interno'],
    yard: 'grama',
  },
  walls: {
    house: [
      { plain: 'mod-parede-tijolo', door: 'mod-porta-madeira', window: 'mod-tijolo-janela' },
      plasterHouse('branco', SLATE_ROOFS),
      plasterHouse('amarelo', CLAY_ROOFS),
      plasterHouse('azul', SLATE_ROOFS),
      plasterHouse('verde', CLAY_ROOFS),
    ],
    tower: [
      { plain: 'mod-parede-lisa', door: 'mod-porta-vidro', window: 'mod-parede-vidro' },
      { plain: 'mod-fachada-metal', door: 'mod-porta-vidro', window: 'mod-parede-vidro' },
    ],
    shop: [
      {
        plain: 'mod-parede-tijolo',
        door: 'mod-porta-vidro',
        window: 'mod-tijolo-janela',
        shopfront: 'mod-vitrine',
      },
    ],
  },
  roof: 'flat',
  backdrop: 'city',
  climate: { preset: 'cidade', fogColor: '#0e0f16', light: 1 },
  gableRoofs: [],
  stairs: INNER_STAIRS,
  vehicles: [
    { key: 'mod-carro', footprint: REAL_CAR },
    { key: 'mod-esportivo', footprint: REAL_CAR },
    { key: 'mod-utilitario', footprint: REAL_CAR },
    { key: 'mod-taxi', footprint: REAL_CAR },
    { key: 'mod-viatura', footprint: REAL_CAR },
    { key: 'mod-hatch-esportivo', footprint: REAL_CAR },
    { key: 'mod-picape', footprint: REAL_CAR },
    { key: 'mod-conversivel', footprint: REAL_CAR },
    { key: 'mod-van', footprint: REAL_VAN },
    { key: 'mod-ambulancia', footprint: REAL_VAN },
    { key: 'mod-muscle', footprint: REAL_VAN },
  ],
  bigVehicles: [
    { key: 'mod-bombeiros', footprint: REAL_TRUCK },
    { key: 'mod-caminhao-lixo', footprint: TRUCK },
  ],
  indoorProps: [
    'mod-sofa',
    'mod-cama',
    'mod-armario',
    'mod-estante',
    'mod-geladeira',
    'mod-fogao',
    'mod-tv',
    'mod-vaso-planta',
    'mesa',
    'cadeira',
  ],
  shopProps: [
    'mod-balcao',
    'mod-prateleira',
    'mod-prateleira',
    'mod-caixa-papelao',
    'mod-vaso-planta',
  ],
  rooftopProps: ['mod-ar-condicionado'],
  streetProps: [
    'mod-balizador',
    'mod-bueiro',
    'mod-cone',
    'mod-canteiro',
    'mod-hidrante',
    'mod-lixeira',
    'mod-banco-praca',
    'mod-placa-rua',
    'mod-banca',
  ],
  lamp: 'mod-poste',
  plazaCenter: 'estatua',
  plazaMonuments: [FOUNTAIN, HERO_STATUE, OBELISK],
  plazaBench: 'mod-banco-praca',
  trees: ['nat-carvalho', 'nat-betula', 'arvore'],
  groundCover: ['nat-flores', 'nat-roseira', 'nat-capim', 'nat-arbusto'],
  yardProps: [
    'mod-canteiro',
    'mod-arbusto',
    'mod-arbusto',
    'mod-caixa-correio',
    'mod-caixa-papelao',
    'mod-churrasqueira',
    'mod-vaso-planta',
    'mod-lixeira',
  ],
  fence: null,
};

const FUTURIST: StyleKit = {
  interiors: [],
  tiles: {
    ground: 'fut-placas-escuras',
    road: 'fut-piso-metal',
    lane: 'fut-piso-metal',
    sidewalk: 'fut-piso-quadriculado',
    plaza: 'fut-piso-quadriculado',
    indoor: ['fut-piso-liso'],
    yard: 'fut-placas-escuras',
  },
  walls: {
    house: [
      { plain: 'fut-painel-faixa', door: 'fut-portal', window: 'fut-parede-janela' },
      { plain: 'fut-painel-astra', door: 'fut-portal', window: 'fut-painel-janela' },
    ],
    tower: [
      { plain: 'fut-painel-astra', door: 'fut-portal', window: 'fut-painel-janela' },
      { plain: 'fut-painel-faixa', door: 'fut-portal', window: 'fut-parede-janela' },
    ],
    shop: [{ plain: 'fut-painel-faixa', door: 'fut-portal', window: 'fut-painel-janela' }],
  },
  roof: 'flat',
  backdrop: 'futurist',
  climate: { preset: 'colonia', fogColor: '#0a1622', light: 1.1 },
  gableRoofs: [],
  stairs: INNER_STAIRS,
  vehicles: [{ key: 'fut-carro', footprint: CAR }],
  bigVehicles: [],
  indoorProps: ['fut-terminal', 'fut-bau-carga', 'fut-caixa-carga', 'fut-tambor'],
  shopProps: ['fut-terminal', 'fut-caixa-carga', 'fut-bau-carga'],
  rooftopProps: ['fut-ventilador', 'fut-tambor'],
  streetProps: ['fut-luz-piso', 'fut-tambor', 'fut-caixa-carga'],
  lamp: 'fut-coluna',
  plazaCenter: 'fut-terminal',
  plazaMonuments: [OBELISK],
  plazaBench: 'pra-banco-pedra',
  trees: ['nat-betula', 'arvore'],
  yardProps: ['fut-caixa-carga', 'fut-tambor', 'fut-bau-carga'],
  groundCover: ['nat-capim', 'nat-seixos'],
  fence: null,
};

/** Concreto escuro com a faixa, a moldura da porta e o letreiro da vitrine na cor do neon. */
const neonWalls = (neon: 'rosa' | 'ciano'): WallSet => ({
  plain: `cyb-concreto-${neon}`,
  door: `cyb-concreto-${neon}-porta`,
  window: `cyb-concreto-${neon}-janela`,
  shopfront: `cyb-vitrine-${neon}`,
});

/** Cidade cyberpunk (RPG-42): asfalto molhado, neon, letreiros, hologramas e máquinas de venda. */
const CYBERPUNK: StyleKit = {
  interiors: [],
  tiles: {
    ground: 'cyb-asfalto',
    road: 'cyb-asfalto',
    lane: 'cyb-asfalto',
    sidewalk: 'cyb-calcada',
    plaza: 'cyb-praca-neon',
    indoor: ['cyb-piso-grade', 'fut-piso-liso'],
    yard: 'cyb-calcada',
  },
  walls: {
    house: [neonWalls('rosa'), neonWalls('ciano')],
    tower: [neonWalls('ciano'), neonWalls('rosa')],
    shop: [neonWalls('rosa'), neonWalls('ciano')],
  },
  roof: 'flat',
  backdrop: 'cyberpunk',
  climate: { preset: 'neon', fogColor: '#150a1f', light: 0.8 },
  gableRoofs: [],
  stairs: INNER_STAIRS,
  vehicles: [{ key: 'fut-carro', footprint: CAR }],
  bigVehicles: [],
  indoorProps: ['cyb-maquina-venda', 'fut-terminal', 'fut-caixa-carga', 'mesa'],
  shopProps: ['cyb-maquina-venda', 'fut-terminal', 'mesa', 'fut-caixa-carga'],
  rooftopProps: ['cyb-letreiro', 'fut-ventilador', 'fut-tambor'],
  streetProps: ['cyb-maquina-venda', 'cyb-letreiro', 'fut-tambor', 'cyb-holograma'],
  lamp: 'cyb-poste-neon',
  plazaCenter: 'cyb-holograma',
  // O holograma é o monumento do cyberpunk: fonte de pedra destoaria do neon.
  plazaMonuments: [],
  plazaBench: 'mod-banco-praca',
  // Cidade cansada: palmeira de avenida e árvore morta no lugar do bosque.
  trees: ['nat-palmeira', 'nat-arvore-seca'],
  yardProps: ['cyb-maquina-venda', 'fut-caixa-carga', 'fut-tambor'],
  groundCover: ['nat-seixos', 'nat-capim'],
  fence: null,
};

export const STYLE_KITS: Readonly<Record<SettlementStyle, StyleKit>> = {
  medieval: MEDIEVAL,
  modern: MODERN,
  futurist: FUTURIST,
  cyberpunk: CYBERPUNK,
};

/** Telhados de duas águas que servem a esta casa: os das paredes ou, sem eles, os do estilo. */
export function gableRoofsFor(kit: StyleKit, walls: WallSet): readonly SizedPiece[] {
  if (walls.roofs && walls.roofs.length > 0) return walls.roofs;
  return kit.roof === 'gable' ? kit.gableRoofs : [];
}

/** Telhado da casa: o de duas águas só fecha com os dois lados pares (o menor modelo é 2×2). */
export function roofFor(
  kit: StyleKit,
  walls: WallSet,
  size: { readonly width: number; readonly depth: number },
): RoofKind {
  const even = size.width % 2 === 0 && size.depth % 2 === 0;
  return even && gableRoofsFor(kit, walls).length > 0 ? 'gable' : 'flat';
}

/** Cabeçalho de um mapa do estilo: o clima e a paisagem em volta que combinam com ele. */
export function styleHeader(kit: StyleKit): MapHeader {
  const header = createDefaultHeader();
  return { ...header, ambience: { ...header.ambience, ...kit.climate, backdrop: kit.backdrop } };
}

/** Toda chave que algum kit usa, para o teste conferir contra o catálogo. */
export function kitKeys(kit: StyleKit): { floors: string[]; walls: string[]; props: SizedPiece[] } {
  const wallSets = [...kit.walls.house, ...kit.walls.tower, ...kit.walls.shop];
  const walls = wallSets.flatMap((set) => [set.plain, set.door, set.window, set.shopfront ?? []]);
  const single = (keys: readonly string[]) =>
    keys.map((key) => ({ key, footprint: propFootprint(key) }));
  const props: SizedPiece[] = [
    ...kit.gableRoofs,
    ...wallSets.flatMap((set) => set.roofs ?? []),
    kit.stairs,
    GARDEN_BED,
    ...kit.plazaMonuments,
    ...kit.vehicles,
    ...kit.bigVehicles,
    ...single([
      ...kit.indoorProps,
      ...kit.shopProps,
      ...kit.rooftopProps,
      ...kit.streetProps,
      ...kit.trees,
      ...kit.yardProps,
      ...kit.groundCover,
      kit.plazaCenter,
      kit.plazaBench,
      ...(kit.lamp ? [kit.lamp] : []),
      ...(kit.fence ? [kit.fence] : []),
    ]),
  ];
  const { tiles } = kit;
  const floors = [tiles.ground, tiles.road, tiles.lane, tiles.plaza, tiles.yard, ...tiles.indoor];
  if (tiles.sidewalk) floors.push(tiles.sidewalk);
  return { floors, walls: walls.flat(), props };
}
