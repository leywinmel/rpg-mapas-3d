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

function building(height: number, seed: string): () => ProceduralLayer[] {
  return () => [
    matte(
      [
        box([1, height, 1], COLORS.building),
        box([0.86, 0.12, 0.86], COLORS.roof, { y: height }),
        box([0.3, 0.3, 0.3], COLORS.buildingDark, { x: 0.2, y: height + 0.12, z: -0.18 }),
      ],
      seed,
    ),
    // Janela acesa brilha no escuro, sem depender da luz da cena.
    { geometry: mergeParts(litWindows(height, seed), `${seed}-janelas`), material: 'glow' },
  ];
}

const BUILDING_HEIGHTS = { low: 2.5, medium: 4.5, tall: 8 } as const;

const BUILDERS: Readonly<Record<BackdropPiece, () => PieceLayer[]>> = {
  arvore: () => getPieceLayers('arvore'),
  rocha: () => getPieceLayers('rocha'),
  pilar: () => getPieceLayers('pilar'),
  cacto: () => getBuiltLayers('fundo-cacto', cactus),
  duna: () => getBuiltLayers('fundo-duna', dune),
  estalagmite: () => getBuiltLayers('fundo-estalagmite', stalagmite),
  'predio-baixo': () =>
    getBuiltLayers('fundo-predio-baixo', building(BUILDING_HEIGHTS.low, 'fundo-predio-baixo')),
  'predio-medio': () =>
    getBuiltLayers('fundo-predio-medio', building(BUILDING_HEIGHTS.medium, 'fundo-predio-medio')),
  'predio-alto': () =>
    getBuiltLayers('fundo-predio-alto', building(BUILDING_HEIGHTS.tall, 'fundo-predio-alto')),
};

/** Camadas de uma peça da paisagem, montadas uma vez e reaproveitadas. */
export function getBackdropLayers(piece: BackdropPiece): PieceLayer[] {
  return BUILDERS[piece]();
}
