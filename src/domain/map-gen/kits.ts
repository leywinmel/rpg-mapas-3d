/**
 * Peças de cada estilo que o gerador e as casas prontas usam. São só chaves do catálogo
 * (src/features/scene/catalog): o domínio não conhece o catálogo, e um teste do lado da cena
 * confere que cada chave existe, é do tipo certo e tem o tamanho em casas que está aqui [#30].
 */
import type { Backdrop } from '../map-document';
import type { Footprint } from '../map-v2';

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

const MEDIEVAL: StyleKit = {
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
  backdrop: 'forest',
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
  trees: ['arvore', 'nat-carvalho', 'nat-pinheiro', 'nat-betula'],
  yardProps: ['barril', 'med-caixote', 'rocha', 'nat-arbusto', 'nat-toco'],
  groundCover: ['nat-capim', 'nat-capim', 'nat-flores', 'nat-seixos', 'nat-folhas'],
  fence: 'med-cerca-madeira',
};

const MODERN: StyleKit = {
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
  backdrop: 'city',
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
  backdrop: 'city',
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

/** Toda chave que algum kit usa, para o teste conferir contra o catálogo. */
export function kitKeys(kit: StyleKit): { floors: string[]; walls: string[]; props: SizedPiece[] } {
  const wallSets = [...kit.walls.house, ...kit.walls.tower, ...kit.walls.shop];
  const walls = wallSets.flatMap((set) => [set.plain, set.door, set.window, set.shopfront ?? []]);
  const single = (keys: readonly string[]) => keys.map((key) => ({ key, footprint: ONE }));
  const props: SizedPiece[] = [
    ...kit.gableRoofs,
    ...wallSets.flatMap((set) => set.roofs ?? []),
    kit.stairs,
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
      ...(kit.lamp ? [kit.lamp] : []),
      ...(kit.fence ? [kit.fence] : []),
    ]),
  ];
  const { tiles } = kit;
  const floors = [tiles.ground, tiles.road, tiles.lane, tiles.plaza, tiles.yard, ...tiles.indoor];
  if (tiles.sidewalk) floors.push(tiles.sidewalk);
  return { floors, walls: walls.flat(), props };
}
