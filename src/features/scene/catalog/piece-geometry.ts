/**
 * Geometria low-poly procedural das peças do catálogo. Cada peça junta várias
 * formas simples numa só BufferGeometry com cor por vértice: assim uma peça
 * inteira é UM InstancedMesh por material, e 10 mil casas de chão viram poucas
 * chamadas de desenho.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FLOOR_CAP_DEPTH, WALL_THICKNESS } from '../layout';
import type { MaterialKind } from './catalog-types';
import { SCENE_PALETTE as C } from './palette';

/** Camada pronta para desenhar: geometria + material (procedural ou vindo de um .glb). */
export type PieceLayer = { geometry: BufferGeometry; material: Material };
type ProceduralLayer = { geometry: BufferGeometry; material: MaterialKind };

type Placement = {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
};

type Part = { geometry: BufferGeometry; color: string };

/** Variação de tom por face: dá o ar facetado sem textura. */
const FACE_JITTER = 0.08;
const SEAM_INSET = 0.985;
const ROUND_SEGMENTS = 8;
const LOW_SEGMENTS = 6;

/** Gerador pseudoaleatório com semente: a mesma peça sai igual em todo navegador. */
function seededRandom(seedText: string): () => number {
  let seed = 0;
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function place(geometry: BufferGeometry, color: string, at: Placement = {}): Part {
  const matrix = new Matrix4().compose(
    new Vector3(at.x ?? 0, at.y ?? 0, at.z ?? 0),
    new Quaternion().setFromEuler(new Euler(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0)),
    new Vector3(at.sx ?? 1, at.sy ?? 1, at.sz ?? 1),
  );
  geometry.applyMatrix4(matrix);
  return { geometry, color };
}

/** Caixa apoiada pela base (y = fundo), que é como as peças são pensadas. */
function box(size: [number, number, number], color: string, at: Placement = {}): Part {
  const [width, height, depth] = size;
  return place(new BoxGeometry(width, height, depth), color, {
    ...at,
    y: (at.y ?? 0) + height / 2,
  });
}

function cylinder(
  dims: { top: number; bottom: number; height: number; segments?: number },
  color: string,
  at: Placement = {},
): Part {
  const geometry = new CylinderGeometry(
    dims.top,
    dims.bottom,
    dims.height,
    dims.segments ?? ROUND_SEGMENTS,
  );
  return place(geometry, color, { ...at, y: (at.y ?? 0) + dims.height / 2 });
}

function cone(
  dims: { radius: number; height: number; segments?: number },
  color: string,
  at: Placement = {},
): Part {
  const geometry = new ConeGeometry(dims.radius, dims.height, dims.segments ?? LOW_SEGMENTS);
  return place(geometry, color, { ...at, y: (at.y ?? 0) + dims.height / 2 });
}

function lump(radius: number, color: string, at: Placement = {}): Part {
  return place(new DodecahedronGeometry(radius, 0), color, at);
}

/** Junta as partes numa geometria só, sem índice, com cor por vértice. */
function mergeParts(parts: Part[], seed: string): BufferGeometry {
  const random = seededRandom(seed);
  const prepared = parts.map(({ geometry, color }) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    for (const name of Object.keys(flat.attributes)) {
      if (name !== 'position' && name !== 'normal') flat.deleteAttribute(name);
    }
    const base = new Color(color);
    const count = flat.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    const shade = new Color();
    for (let vertex = 0; vertex < count; vertex += 3) {
      const factor = 1 + (random() * 2 - 1) * FACE_JITTER;
      shade.copy(base).multiplyScalar(factor);
      for (let corner = 0; corner < 3; corner += 1) {
        colors.set([shade.r, shade.g, shade.b], (vertex + corner) * 3);
      }
    }
    flat.setAttribute('color', new BufferAttribute(colors, 3));
    return flat;
  });
  const merged = mergeGeometries(prepared, false);
  if (!merged) throw new Error(`Não foi possível montar a peça ${seed}.`);
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function matte(parts: Part[], seed: string): ProceduralLayer {
  return { geometry: mergeParts(parts, seed), material: 'matte' };
}

// ---------------------------------------------------------------------------
// Chão: só a tampa (topo em y = 0); a coluna embaixo é compartilhada.
// ---------------------------------------------------------------------------

const CAP_BOTTOM = -FLOOR_CAP_DEPTH;

function capBase(color: string): Part {
  return box([SEAM_INSET, FLOOR_CAP_DEPTH - 0.02, SEAM_INSET], color, { y: CAP_BOTTOM });
}

function stoneFloor(): ProceduralLayer[] {
  const random = seededRandom('piso-pedra-lajes');
  const slabs: Part[] = [capBase(C.stoneSeam)];
  const half = 0.47;
  for (const ox of [-0.24, 0.24]) {
    for (const oz of [-0.24, 0.24]) {
      const lift = random() * 0.02;
      slabs.push(box([half, 0.03 + lift, half], C.stoneTop, { x: ox, y: -0.03, z: oz }));
    }
  }
  return [matte(slabs, 'piso-pedra')];
}

function woodFloor(): ProceduralLayer[] {
  const random = seededRandom('piso-madeira-tabuas');
  const planks: Part[] = [capBase(C.woodSeam)];
  const plankWidth = 0.235;
  for (let index = 0; index < 4; index += 1) {
    const lift = random() * 0.012;
    planks.push(
      box([SEAM_INSET, 0.03 + lift, plankWidth - 0.012], C.woodTop, {
        y: -0.03,
        z: -0.375 + index * 0.25,
      }),
    );
  }
  return [matte(planks, 'piso-madeira')];
}

function dirtFloor(): ProceduralLayer[] {
  return [
    matte(
      [
        box([1, FLOOR_CAP_DEPTH, 1], C.dirtTop, { y: CAP_BOTTOM }),
        lump(0.06, C.dirtPebble, { x: -0.22, y: 0.01, z: 0.18, sy: 0.5 }),
        lump(0.045, C.dirtPebble, { x: 0.25, y: 0.01, z: -0.2, sy: 0.5 }),
        lump(0.035, C.dirtPebble, { x: 0.05, y: 0.005, z: 0.3, sy: 0.6 }),
      ],
      'terra',
    ),
  ];
}

function grassFloor(): ProceduralLayer[] {
  const tufts: Part[] = [box([1, FLOOR_CAP_DEPTH, 1], C.grassTop, { y: CAP_BOTTOM })];
  const spots: Array<[number, number]> = [
    [-0.28, -0.2],
    [0.2, 0.25],
    [0.3, -0.3],
    [-0.15, 0.32],
  ];
  for (const [x, z] of spots) {
    tufts.push(cone({ radius: 0.05, height: 0.12, segments: 4 }, C.grassTuft, { x, z }));
  }
  return [matte(tufts, 'grama')];
}

function waterFloor(): ProceduralLayer[] {
  return [
    matte([box([1, FLOOR_CAP_DEPTH - 0.06, 1], C.waterSide, { y: CAP_BOTTOM })], 'agua-leito'),
    {
      geometry: mergeParts([box([1, 0.05, 1], C.waterTop, { y: -0.08 })], 'agua'),
      material: 'water',
    },
  ];
}

// ---------------------------------------------------------------------------
// Paredes: um segmento de 1 casa de comprimento e 1 de altura, centrado em x.
// ---------------------------------------------------------------------------

function stoneWall(): ProceduralLayer[] {
  const random = seededRandom('parede-pedra-tijolos');
  const parts: Part[] = [box([0.98, 1, WALL_THICKNESS * 0.8], C.wallStoneDark)];
  const rowHeight = 0.25;
  for (let row = 0; row < 4; row += 1) {
    const offset = row % 2 === 0 ? 0 : 0.25;
    for (let column = -1; column <= 1; column += 1) {
      const center = column * 0.5 + offset;
      const left = Math.max(center - 0.24, -0.5);
      const right = Math.min(center + 0.24, 0.5);
      if (right - left < 0.05) continue;
      const bulge = random() * 0.02;
      parts.push(
        box([right - left, rowHeight - 0.03, WALL_THICKNESS + bulge], C.wallStone, {
          x: (left + right) / 2,
          y: row * rowHeight + 0.015,
        }),
      );
    }
  }
  return [matte(parts, 'parede-pedra')];
}

function woodWall(): ProceduralLayer[] {
  const parts: Part[] = [];
  const plankWidth = 0.2;
  for (let index = 0; index < 5; index += 1) {
    parts.push(
      box([plankWidth - 0.015, 1, WALL_THICKNESS * 0.7], C.wallWood, {
        x: -0.4 + index * plankWidth,
      }),
    );
  }
  parts.push(box([1, 0.08, WALL_THICKNESS], C.wallWoodDark, { y: 0.7 }));
  parts.push(box([1, 0.08, WALL_THICKNESS], C.wallWoodDark, { y: 0.2 }));
  return [matte(parts, 'parede-madeira')];
}

function ironGrate(): ProceduralLayer[] {
  const parts: Part[] = [
    box([1, 0.06, 0.07], C.ironLight, { y: 0 }),
    box([1, 0.06, 0.07], C.ironLight, { y: 0.94 }),
  ];
  for (let index = 0; index < 5; index += 1) {
    parts.push(
      cylinder({ top: 0.025, bottom: 0.025, height: 0.88, segments: LOW_SEGMENTS }, C.iron, {
        x: -0.4 + index * 0.2,
        y: 0.06,
      }),
    );
  }
  return [{ geometry: mergeParts(parts, 'grade'), material: 'metal' }];
}

// ---------------------------------------------------------------------------
// Objetos: apoiados em y = 0, centrados na casa.
// ---------------------------------------------------------------------------

function barrel(): ProceduralLayer[] {
  return [
    matte(
      [
        cylinder({ top: 0.26, bottom: 0.26, height: 0.72 }, C.barrelWood),
        cylinder({ top: 0.3, bottom: 0.3, height: 0.3 }, C.barrelWood, { y: 0.21 }),
        cylinder({ top: 0.275, bottom: 0.275, height: 0.05 }, C.iron, { y: 0.1 }),
        cylinder({ top: 0.275, bottom: 0.275, height: 0.05 }, C.iron, { y: 0.57 }),
      ],
      'barril',
    ),
  ];
}

function crate(): ProceduralLayer[] {
  const size = 0.6;
  const frame = 0.07;
  const parts: Part[] = [box([size, size, size], C.crateWood)];
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      parts.push(
        box([frame, size + 0.01, frame], C.crateWoodDark, {
          x: (x * (size - frame)) / 2,
          z: (z * (size - frame)) / 2,
        }),
      );
    }
  }
  parts.push(box([size + 0.01, frame, frame], C.crateWoodDark, { y: size - frame, z: 0.27 }));
  parts.push(box([size + 0.01, frame, frame], C.crateWoodDark, { y: size - frame, z: -0.27 }));
  return [matte(parts, 'caixa')];
}

function legs(spread: { x: number; z: number }, height: number, color: string): Part[] {
  const parts: Part[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(box([0.07, height, 0.07], color, { x: sx * spread.x, z: sz * spread.z }));
    }
  }
  return parts;
}

function table(): ProceduralLayer[] {
  return [
    matte(
      [
        box([0.92, 0.07, 0.62], C.tableWood, { y: 0.68 }),
        ...legs({ x: 0.38, z: 0.24 }, 0.68, C.crateWoodDark),
      ],
      'mesa',
    ),
  ];
}

function chair(): ProceduralLayer[] {
  return [
    matte(
      [
        box([0.42, 0.06, 0.42], C.chairWood, { y: 0.4 }),
        ...legs({ x: 0.17, z: 0.17 }, 0.4, C.crateWoodDark),
        box([0.42, 0.45, 0.06], C.chairWood, { y: 0.46, z: -0.18 }),
      ],
      'cadeira',
    ),
  ];
}

function chest(): ProceduralLayer[] {
  const lid = new CylinderGeometry(0.22, 0.22, 0.7, ROUND_SEGMENTS, 1, false, 0, Math.PI);
  return [
    matte(
      [
        box([0.7, 0.36, 0.44], C.chestWood),
        // Meio cilindro deitado no eixo x: a tampa abaulada do baú.
        place(lid, C.chestWood, { y: 0.36, rz: Math.PI / 2 }),
        box([0.06, 0.38, 0.46], C.gold, { x: -0.22 }),
        box([0.06, 0.38, 0.46], C.gold, { x: 0.22 }),
        box([0.1, 0.12, 0.04], C.gold, { y: 0.26, z: 0.23 }),
      ],
      'bau',
    ),
  ];
}

function pillar(): ProceduralLayer[] {
  return [
    matte(
      [
        box([0.62, 0.16, 0.62], C.pillarStoneDark),
        cylinder({ top: 0.2, bottom: 0.24, height: 1.9 }, C.pillarStone, { y: 0.16 }),
        box([0.58, 0.16, 0.58], C.pillarStoneDark, { y: 2.06 }),
      ],
      'pilar',
    ),
  ];
}

function statue(): ProceduralLayer[] {
  return [
    matte(
      [
        box([0.66, 0.28, 0.66], C.statueStoneDark),
        cylinder({ top: 0.14, bottom: 0.27, height: 0.95, segments: LOW_SEGMENTS }, C.statueStone, {
          y: 0.28,
        }),
        box([0.46, 0.12, 0.2], C.statueStone, { y: 1.1 }),
        place(new IcosahedronGeometry(0.14, 0), C.statueStone, { y: 1.36 }),
      ],
      'estatua',
    ),
  ];
}

function rock(): ProceduralLayer[] {
  return [
    matte(
      [
        lump(0.32, C.rock, { y: 0.24, sx: 1.1, sy: 0.75, sz: 0.9, ry: 0.4 }),
        lump(0.16, C.rockDark, { x: 0.28, y: 0.115, z: 0.18, sy: 0.7 }),
      ],
      'rocha',
    ),
  ];
}

function tree(): ProceduralLayer[] {
  return [
    matte(
      [
        cylinder({ top: 0.07, bottom: 0.11, height: 0.6, segments: LOW_SEGMENTS }, C.trunk),
        cone({ radius: 0.45, height: 0.75 }, C.leaves, { y: 0.45 }),
        cone({ radius: 0.36, height: 0.65 }, C.leavesLight, { y: 0.85, ry: 0.5 }),
        cone({ radius: 0.24, height: 0.5 }, C.leaves, { y: 1.2, ry: 1 }),
      ],
      'arvore',
    ),
  ];
}

function torch(): ProceduralLayer[] {
  return [
    matte(
      [
        box([0.22, 0.06, 0.22], C.iron),
        cylinder({ top: 0.035, bottom: 0.05, height: 0.78, segments: LOW_SEGMENTS }, C.torchStick, {
          y: 0.06,
        }),
        cylinder({ top: 0.09, bottom: 0.05, height: 0.1, segments: LOW_SEGMENTS }, C.iron, {
          y: 0.8,
        }),
      ],
      'tocha',
    ),
    {
      geometry: mergeParts(
        [
          cone({ radius: 0.075, height: 0.24, segments: 5 }, C.flame, { y: 0.88 }),
          cone({ radius: 0.04, height: 0.14, segments: 5 }, C.flameCore, { y: 0.9 }),
        ],
        'tocha-chama',
      ),
      material: 'glow',
    },
  ];
}

/** Caixa marcada com um X brilhante: peça que não carregou, sem derrubar a cena. */
function fallback(): ProceduralLayer[] {
  return [
    matte([box([0.6, 0.6, 0.6], C.fallback)], 'peca-faltando'),
    {
      geometry: mergeParts(
        [
          box([0.75, 0.04, 0.06], C.fallbackMark, { y: 0.6, ry: Math.PI / 4 }),
          box([0.75, 0.04, 0.06], C.fallbackMark, { y: 0.6, ry: -Math.PI / 4 }),
        ],
        'peca-faltando-x',
      ),
      material: 'glow',
    },
  ];
}

export const PROCEDURAL_BUILDERS: Readonly<Record<string, () => ProceduralLayer[]>> = {
  'piso-pedra': stoneFloor,
  'piso-madeira': woodFloor,
  terra: dirtFloor,
  grama: grassFloor,
  agua: waterFloor,
  'parede-pedra': stoneWall,
  'parede-madeira': woodWall,
  grade: ironGrate,
  barril: barrel,
  caixa: crate,
  mesa: table,
  cadeira: chair,
  bau: chest,
  pilar: pillar,
  estatua: statue,
  rocha: rock,
  arvore: tree,
  tocha: torch,
};

// ---------------------------------------------------------------------------
// Materiais compartilhados (um por tipo): trocar de peça não cria shader novo.
// ---------------------------------------------------------------------------

const GHOST_OPACITY = 0.45;

function createMaterial(kind: MaterialKind | 'column'): Material {
  switch (kind) {
    case 'matte':
      return new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92 });
    case 'metal':
      return new MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.45,
        metalness: 0.65,
      });
    case 'water':
      return new MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.12,
        metalness: 0.2,
        transparent: true,
        opacity: 0.82,
      });
    case 'glow':
      return new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    case 'column':
      return new MeshStandardMaterial({ flatShading: true, roughness: 0.95 });
  }
}

const materialCache = new Map<string, Material>();

export function getMaterial(kind: MaterialKind | 'column'): Material {
  const cached = materialCache.get(kind);
  if (cached) return cached;
  const material = createMaterial(kind);
  materialCache.set(kind, material);
  return material;
}

const ghostCache = new WeakMap<Material, Material>();

/** Versão translúcida do material, para a pré-visualização da peça sob o cursor. */
export function getGhostMaterial(material: Material): Material {
  const cached = ghostCache.get(material);
  if (cached) return cached;
  const ghost = material.clone();
  ghost.transparent = true;
  ghost.opacity = GHOST_OPACITY;
  ghost.depthWrite = false;
  ghostCache.set(material, ghost);
  return ghost;
}

function toPieceLayers(layers: ProceduralLayer[]): PieceLayer[] {
  return layers.map((layer) => ({
    geometry: layer.geometry,
    material: getMaterial(layer.material),
  }));
}

const layerCache = new Map<string, PieceLayer[]>();
let fallbackLayers: PieceLayer[] | null = null;

export function getFallbackLayers(): PieceLayer[] {
  fallbackLayers ??= toPieceLayers(fallback());
  return fallbackLayers;
}

export function hasProceduralBuilder(key: string): boolean {
  return key in PROCEDURAL_BUILDERS;
}

/** Geometria da peça, montada uma vez e reaproveitada por todas as instâncias. */
export function getPieceLayers(key: string): PieceLayer[] {
  const cached = layerCache.get(key);
  if (cached) return cached;
  const builder = PROCEDURAL_BUILDERS[key];
  if (!builder) return getFallbackLayers();
  const layers = toPieceLayers(builder());
  layerCache.set(key, layers);
  return layers;
}

let columnGeometry: BufferGeometry | null = null;

/** Coluna lisa sob as tampas de chão: topo em y = 0, esticada em y por instância. */
export function getColumnGeometry(): BufferGeometry {
  if (columnGeometry) return columnGeometry;
  columnGeometry = new BoxGeometry(1, 1, 1).translate(0, -0.5, 0);
  return columnGeometry;
}
