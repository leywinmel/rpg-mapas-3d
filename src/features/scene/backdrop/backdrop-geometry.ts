/**
 * Geometria low-poly das peças da paisagem do fundo (RPG-40). Árvore, rocha e pilar vêm do
 * catálogo do mapa; aqui ficam as que só a paisagem usa. Mesmo estilo das peças do mapa: formas
 * simples, cor por vértice e uma geometria por material.
 */
import { PlaneGeometry, SphereGeometry } from 'three';
import {
  box,
  cone,
  cylinder,
  getBuiltLayers,
  getPieceLayers,
  matte,
  mergeParts,
  place,
  seededRandom,
  type Part,
  type PieceLayer,
  type ProceduralLayer,
} from '../catalog/piece-geometry';
import type { BackdropPiece } from './backdrop';

const COLORS = {
  cactus: '#3f5a2e',
  cactusDark: '#324a24',
  dune: '#8a7050',
  duneLight: '#9a7e5a',
  stalagmite: '#3a343c',
  stalagmiteDark: '#2d2830',
  building: '#33333d',
  buildingDark: '#26262e',
  roof: '#1e1e25',
  windowWarm: '#ffcf7a',
  windowCool: '#a8d4ff',
  cottageWall: '#8a7458',
  houseWall: '#a08a6c',
  houseRoof: '#7a3a2a',
  houseLightWall: '#b9b4a8',
  houseLightRoof: '#3e434c',
  townhouseWall: '#a89a6a',
  townhouseRoof: '#5a3b2a',
  windowDark: '#2c3038',
  trim: '#d8d2c4',
  cottageRoof: '#4a3024',
  stone: '#6b6660',
  stoneRoof: '#3b2a22',
  doorDark: '#2a1e16',
  futureWhite: '#c9d2dc',
  futureLight: '#dfe6ee',
  futureDark: '#4a5562',
  futureGlow: '#5ff0ff',
  neonBody: '#1f1a28',
  neonBodyLow: '#27202f',
  neonPink: '#ff3fb4',
  neonCyan: '#3ff0ff',
} as const;

const DUNE_SEGMENTS = { width: 9, height: 3 };
const CACTUS_SEGMENTS = 6;

function cactus(): ProceduralLayer[] {
  return [
    matte(
      [
        cylinder(
          { top: 0.1, bottom: 0.13, height: 1.15, segments: CACTUS_SEGMENTS },
          COLORS.cactus,
        ),
        // Braço direito: o cotovelo deitado e o braço em pé.
        cylinder(
          { top: 0.07, bottom: 0.07, height: 0.24, segments: CACTUS_SEGMENTS },
          COLORS.cactus,
          {
            x: 0.12,
            y: 0.45,
            rz: Math.PI / 2,
          },
        ),
        cylinder(
          { top: 0.06, bottom: 0.07, height: 0.36, segments: CACTUS_SEGMENTS },
          COLORS.cactusDark,
          {
            x: 0.24,
            y: 0.45,
          },
        ),
        // Braço esquerdo, mais curto e mais alto.
        cylinder(
          { top: 0.06, bottom: 0.06, height: 0.2, segments: CACTUS_SEGMENTS },
          COLORS.cactus,
          {
            x: -0.1,
            y: 0.68,
            rz: Math.PI / 2,
          },
        ),
        cylinder(
          { top: 0.05, bottom: 0.06, height: 0.26, segments: CACTUS_SEGMENTS },
          COLORS.cactusDark,
          {
            x: -0.2,
            y: 0.68,
          },
        ),
      ],
      'fundo-cacto',
    ),
  ];
}

/** Meia esfera achatada: a duna nasce do chão, sem base aparecendo. */
function dunePart(color: string, at: Parameters<typeof place>[2]): Part {
  const dome = new SphereGeometry(
    1,
    DUNE_SEGMENTS.width,
    DUNE_SEGMENTS.height,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  return place(dome, color, at);
}

function dune(): ProceduralLayer[] {
  return [
    matte(
      [
        dunePart(COLORS.dune, { sx: 1, sy: 0.24, sz: 0.6 }),
        dunePart(COLORS.duneLight, { x: 0.55, z: 0.25, sx: 0.6, sy: 0.22, sz: 0.4 }),
      ],
      'fundo-duna',
    ),
  ];
}

function stalagmite(): ProceduralLayer[] {
  return [
    matte(
      [
        cone({ radius: 0.3, height: 1.4 }, COLORS.stalagmite),
        cone({ radius: 0.16, height: 0.75 }, COLORS.stalagmiteDark, { x: 0.3, z: 0.12 }),
        cone({ radius: 0.12, height: 0.5 }, COLORS.stalagmite, { x: -0.22, z: -0.2 }),
      ],
      'fundo-estalagmite',
    ),
  ];
}

const WINDOW = { width: 0.16, height: 0.22, rowGap: 0.55, columns: [-0.28, 0, 0.28], lit: 0.38 };
/** A janela fica um fio para fora da parede, para não brigar com ela na profundidade. */
const WINDOW_OFFSET = 0.505;
const FACE_TURNS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
const FIRST_ROW = 0.5;

/** Janelas acesas das quatro faces; as apagadas são só a parede escura. */
function litWindows(height: number, seed: string): Part[] {
  const random = seededRandom(seed);
  const windows: Part[] = [];
  for (const turn of FACE_TURNS) {
    for (let y = FIRST_ROW; y < height - WINDOW.rowGap / 2; y += WINDOW.rowGap) {
      for (const column of WINDOW.columns) {
        if (random() > WINDOW.lit) continue;
        const color = random() < 0.75 ? COLORS.windowWarm : COLORS.windowCool;
        windows.push(
          place(new PlaneGeometry(WINDOW.width, WINDOW.height), color, {
            x: Math.sin(turn) * WINDOW_OFFSET + Math.cos(turn) * column,
            y,
            z: Math.cos(turn) * WINDOW_OFFSET - Math.sin(turn) * column,
            ry: turn,
          }),
        );
      }
    }
  }
  return windows;
}

type HouseLook = { wall: string; roof: string; floors: 1 | 2; seed: string };

const HOUSE = {
  width: 1,
  depth: 0.85,
  /** Altura de um andar da casa, na mesma medida do lote. */
  story: 0.62,
  /** Telhado de duas águas: prisma de três lados com a cumeeira de frente para a rua. */
  roofRadius: 0.64,
  roofLength: 0.97,
} as const;
/** Prisma deitado com a ponta para cima: o eixo vai de frente para os fundos (z). */
const ROOF_TILT = -Math.PI / 2;
const TRIANGLE_SIDES = 3;

/** Janelas da frente de um andar: a da direita acesa, a da esquerda apagada. */
function frontWindows(y: number, front: number): { lit: Part; dark: Part } {
  const pane = () => new PlaneGeometry(0.18, 0.18);
  return {
    lit: place(pane(), COLORS.windowWarm, { x: 0.27, y, z: front }),
    dark: place(pane(), COLORS.windowDark, { x: -0.27, y, z: front }),
  };
}

/** Casa de bairro: térrea ou sobrado, telhado de duas águas, porta e janelas na frente. */
function house({ wall, roof, floors, seed }: HouseLook): () => ProceduralLayer[] {
  return () => {
    const height = HOUSE.story * floors;
    const front = HOUSE.depth / 2 + FACE_GAP;
    const rows = Array.from({ length: floors }, (_, floor) =>
      frontWindows(HOUSE.story * (floor + 0.55), front),
    );
    const doorHeight = 0.34;
    return [
      matte(
        [
          box([HOUSE.width, height, HOUSE.depth], wall),
          // O centro do prisma fica meio raio acima do topo da parede: a base dele encosta nela.
          cylinder(
            {
              top: HOUSE.roofRadius,
              bottom: HOUSE.roofRadius,
              height: HOUSE.roofLength,
              segments: TRIANGLE_SIDES,
            },
            roof,
            { y: height + HOUSE.roofRadius / 2 - HOUSE.roofLength / 2, rx: ROOF_TILT },
          ),
          box([1.04, 0.05, HOUSE.depth + 0.04], COLORS.trim, { y: height - 0.05 }),
          place(new PlaneGeometry(0.2, doorHeight), COLORS.doorDark, {
            y: doorHeight / 2,
            z: front,
          }),
          ...rows.slice(1).map((row) => row.dark),
          rows[0]!.dark,
        ],
        seed,
      ),
      // Só uma janela por andar acende: de noite o bairro parece morado, sem virar letreiro.
      glow(
        rows.map((row) => row.lit),
        seed,
      ),
    ];
  };
}

const PYRAMID_SIDES = 4;
const ROUND_SIDES = 8;
/** Pirâmide de quatro lados girada 45° para as águas do telhado acompanharem as paredes. */
const EIGHTH_TURN = Math.PI / 4;
/** Plano de enfeite um fio à frente da parede, para não brigar com ela na profundidade. */
const FACE_GAP = 0.005;

function glow(parts: Part[], seed: string): ProceduralLayer {
  return { geometry: mergeParts(parts, `${seed}-luz`), material: 'glow' };
}

/** Casebre do campo: paredes de taipa, telhado de quatro águas, chaminé e uma janela acesa. */
function cottage(): ProceduralLayer[] {
  const half = 0.4;
  return [
    matte(
      [
        box([2 * half, 0.55, 2 * half], COLORS.cottageWall),
        cone({ radius: 0.66, height: 0.45, segments: PYRAMID_SIDES }, COLORS.cottageRoof, {
          y: 0.55,
          ry: EIGHTH_TURN,
        }),
        box([0.12, 0.3, 0.12], COLORS.stone, { x: 0.2, y: 0.7, z: -0.15 }),
        place(new PlaneGeometry(0.16, 0.3), COLORS.doorDark, {
          x: -0.15,
          y: 0.15,
          z: half + FACE_GAP,
        }),
      ],
      'fundo-casebre',
    ),
    glow(
      [
        place(new PlaneGeometry(0.14, 0.14), COLORS.windowWarm, {
          x: 0.17,
          y: 0.3,
          z: half + FACE_GAP,
        }),
      ],
      'fundo-casebre',
    ),
  ];
}

/** Torre de vigia de pedra com o telhado cônico e a seteira acesa. */
function stoneTower(): ProceduralLayer[] {
  const height = 1.6;
  return [
    matte(
      [
        cylinder({ top: 0.32, bottom: 0.38, height, segments: ROUND_SIDES }, COLORS.stone),
        cone({ radius: 0.45, height: 0.6, segments: ROUND_SIDES }, COLORS.stoneRoof, { y: height }),
      ],
      'fundo-torre-pedra',
    ),
    glow(
      [
        place(new PlaneGeometry(0.08, 0.18), COLORS.windowWarm, {
          y: 1.2,
          z: 0.34,
        }),
      ],
      'fundo-torre-pedra',
    ),
  ];
}

/** Anel de luz em volta de um tronco redondo, na altura pedida. */
function lightRing(radius: number, y: number, color: string): Part {
  return cylinder({ top: radius, bottom: radius, height: 0.07, segments: ROUND_SIDES }, color, {
    y,
  });
}

/** Torre clara e afinada no topo, com anéis de luz ciano. */
function futureTower(): ProceduralLayer[] {
  const height = 4;
  return [
    matte(
      [
        cylinder({ top: 0.28, bottom: 0.4, height, segments: ROUND_SIDES }, COLORS.futureWhite),
        cylinder(
          { top: 0.45, bottom: 0.3, height: 0.25, segments: ROUND_SIDES },
          COLORS.futureDark,
          { y: height },
        ),
      ],
      'fundo-torre-futurista',
    ),
    glow(
      [1, 2, 3].map((floor) => lightRing(0.42 - floor * 0.03, floor, COLORS.futureGlow)),
      'fundo-torre-futurista',
    ),
  ];
}

/** Cúpula de habitação sobre um anel escuro, com a faixa de luz no pé. */
function dome(): ProceduralLayer[] {
  const segments = { width: 10, height: 5 };
  return [
    matte(
      [
        cylinder({ top: 0.82, bottom: 0.86, height: 0.15, segments: 10 }, COLORS.futureDark),
        place(
          new SphereGeometry(0.8, segments.width, segments.height, 0, Math.PI * 2, 0, Math.PI / 2),
          COLORS.futureWhite,
          { y: 0.15 },
        ),
      ],
      'fundo-cupula',
    ),
    glow([lightRing(0.87, 0.04, COLORS.futureGlow)], 'fundo-cupula'),
  ];
}

/** Agulha: o arranha-céu fino da colônia, com a ponta acesa. */
function spire(): ProceduralLayer[] {
  const height = 5;
  return [
    matte(
      [
        cylinder({ top: 0.4, bottom: 0.5, height: 0.4, segments: 6 }, COLORS.futureDark),
        cone({ radius: 0.36, height, segments: 6 }, COLORS.futureLight, { y: 0.4 }),
      ],
      'fundo-agulha',
    ),
    glow(
      [
        cone({ radius: 0.07, height: 0.5, segments: 6 }, COLORS.futureGlow, { y: height + 0.2 }),
        lightRing(0.3, 1.6, COLORS.futureGlow),
      ],
      'fundo-agulha',
    ),
  ];
}

const CORNERS = [
  [-0.5, -0.5],
  [0.5, -0.5],
  [0.5, 0.5],
  [-0.5, 0.5],
] as const;

/** Prédio escuro de neon: quinas acesas, faixa no topo, letreiro na fachada e janelas. */
function neonBuilding(height: number, seed: string, body: string): () => ProceduralLayer[] {
  return () => {
    const strips = CORNERS.map(([x, z], index) =>
      box([0.05, height - 0.2, 0.05], index % 2 === 0 ? COLORS.neonPink : COLORS.neonCyan, {
        x,
        z,
        y: 0.1,
      }),
    );
    return [
      matte([box([1, height, 1], body), box([0.86, 0.12, 0.86], COLORS.roof, { y: height })], seed),
      glow(
        [
          ...strips,
          box([1.02, 0.08, 1.02], COLORS.neonCyan, { y: height - 0.3 }),
          box([0.62, 0.4, 0.04], COLORS.neonPink, { y: height * 0.6, z: 0.52 }),
          ...litWindows(height * 0.5, seed),
        ],
        seed,
      ),
    ];
  };
}

const NEON_HEIGHTS = { low: 3.5, tall: 9 } as const;

const BUILDERS: Readonly<Record<BackdropPiece, () => PieceLayer[]>> = {
  arvore: () => getPieceLayers('arvore'),
  rocha: () => getPieceLayers('rocha'),
  pilar: () => getPieceLayers('pilar'),
  cacto: () => getBuiltLayers('fundo-cacto', cactus),
  duna: () => getBuiltLayers('fundo-duna', dune),
  estalagmite: () => getBuiltLayers('fundo-estalagmite', stalagmite),
  casa: () =>
    getBuiltLayers(
      'fundo-casa',
      house({ wall: COLORS.houseWall, roof: COLORS.houseRoof, floors: 1, seed: 'fundo-casa' }),
    ),
  'casa-clara': () =>
    getBuiltLayers(
      'fundo-casa-clara',
      house({
        wall: COLORS.houseLightWall,
        roof: COLORS.houseLightRoof,
        floors: 1,
        seed: 'fundo-casa-clara',
      }),
    ),
  sobrado: () =>
    getBuiltLayers(
      'fundo-sobrado',
      house({
        wall: COLORS.townhouseWall,
        roof: COLORS.townhouseRoof,
        floors: 2,
        seed: 'fundo-sobrado',
      }),
    ),
  casebre: () => getBuiltLayers('fundo-casebre', cottage),
  'torre-pedra': () => getBuiltLayers('fundo-torre-pedra', stoneTower),
  'torre-futurista': () => getBuiltLayers('fundo-torre-futurista', futureTower),
  cupula: () => getBuiltLayers('fundo-cupula', dome),
  agulha: () => getBuiltLayers('fundo-agulha', spire),
  megatorre: () =>
    getBuiltLayers(
      'fundo-megatorre',
      neonBuilding(NEON_HEIGHTS.tall, 'fundo-megatorre', COLORS.neonBody),
    ),
  'predio-neon': () =>
    getBuiltLayers(
      'fundo-predio-neon',
      neonBuilding(NEON_HEIGHTS.low, 'fundo-predio-neon', COLORS.neonBodyLow),
    ),
};

/** Camadas de uma peça da paisagem, montadas uma vez e reaproveitadas. */
export function getBackdropLayers(piece: BackdropPiece): PieceLayer[] {
  return BUILDERS[piece]();
}
