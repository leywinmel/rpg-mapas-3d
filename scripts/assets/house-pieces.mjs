// Gera as peças das casas modernas de bairro (RPG-52): paredes de reboco em quatro cores
// (lisa, com janela e com porta, sempre na mesma cor, para a casa fechar sem emenda),
// telhados de duas águas em ardósia e em telha de barro, cerca branca, arbusto e caixa de
// correio. Tudo é geometria simples com cor no material, sem textura: pesa pouco e combina
// com o resto do estilo moderno.
// Formato igual ao das peças de pacote: origem no centro do footprint, base em y = 0, uma
// casa = 1 unidade, parede com 1 casa de largura e 2 de altura. Os dois lados das paredes são
// iguais (a parede no mapa não tem frente nem verso).
// uso: node scripts/assets/house-pieces.mjs <public/assets/modern>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const [OUT] = process.argv.slice(2);
if (!OUT) throw new Error('uso: node scripts/assets/house-pieces.mjs <public/assets/modern>');

const WALL = { width: 1, height: 2, half: 0.05 };
/** Rodapé e friso saltam um pouco da parede, dos dois lados. */
const BASEBOARD = { height: 0.14, half: 0.062 };
const FRIEZE = { y0: 1.88, half: 0.06 };
/** Mesma janela das paredes de tijolo, para as duas famílias alinharem na fachada. */
const WINDOW = { x0: -0.22, x1: 0.22, y0: 0.7, y1: 1.6 };
const FRAME = 0.035;
const SHUTTER = { width: 0.12, gap: 0.012, out: 0.016 };
const DOOR = { x0: -0.26, x1: 0.26, y1: 1.45 };
const AWNING = { y0: 1.5, y1: 1.56, halfX: 0.34, out: 0.16 };
/** Inclinação dos telhados: quanto o telhado sobe para cada casa de meia largura. */
const ROOF_PITCH = 0.75;
const ROOF = { eave: 0.2, gableOut: 0.15, thickness: 0.07, rows: 7, lip: 0.018 };

/** sRGB (0 a 255) para a cor linear que o glTF espera no fator do material. */
const linear = (rgb) => rgb.map((value) => ((value / 255 + 0.055) / 1.055) ** 2.4);
const shade = (rgb, factor) => rgb.map((value) => Math.round(value * factor));

const TRIM = [238, 236, 230];
const GLASS = [140, 172, 190];
const WOOD = [118, 78, 48];

/** Cor do reboco e da veneziana de cada casa. */
const PLASTERS = [
  { key: 'branco', label: 'branco', plaster: [232, 228, 218], shutter: [62, 92, 72] },
  { key: 'amarelo', label: 'amarelo', plaster: [230, 202, 134], shutter: [58, 84, 118] },
  { key: 'azul', label: 'azul', plaster: [148, 182, 204], shutter: [236, 234, 228] },
  { key: 'verde', label: 'verde', plaster: [158, 182, 146], shutter: WOOD },
];

const ROOF_COLORS = [
  { key: 'ardosia', tile: [74, 78, 88] },
  { key: 'barro', tile: [168, 86, 58] },
];

// ---------------------------------------------------------------------------
// Malha
// ---------------------------------------------------------------------------

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalOf(a, b, c) {
  const u = sub(b, a);
  const v = sub(c, a);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...n) || 1;
  return n.map((value) => value / length);
}

/** Malha de faces chapadas (cada face com a própria normal: é o visual low-poly do site). */
function builder() {
  const positions = [];
  const normals = [];
  const tri = (a, b, c) => {
    const normal = normalOf(a, b, c);
    for (const point of [a, b, c]) {
      positions.push(...point);
      normals.push(...normal);
    }
  };
  /** Quadrilátero em sentido anti-horário visto de fora. */
  const quad = (a, b, c, d) => {
    tri(a, b, c);
    tri(a, c, d);
  };
  const box = ({ x0, x1, y0, y1, z0, z1 }, skip = []) => {
    const faces = {
      px: [
        [x1, y0, z1],
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
      ],
      nx: [
        [x0, y0, z0],
        [x0, y0, z1],
        [x0, y1, z1],
        [x0, y1, z0],
      ],
      py: [
        [x0, y1, z1],
        [x1, y1, z1],
        [x1, y1, z0],
        [x0, y1, z0],
      ],
      ny: [
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y0, z1],
        [x0, y0, z1],
      ],
      pz: [
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1],
      ],
      nz: [
        [x1, y0, z0],
        [x0, y0, z0],
        [x0, y1, z0],
        [x1, y1, z0],
      ],
    };
    for (const [name, corners] of Object.entries(faces)) {
      if (!skip.includes(name)) quad(...corners);
    }
  };
  return { positions, normals, tri, quad, box };
}

/** Uma camada da peça: malha e cor do material. */
function layers(spec) {
  return Object.fromEntries(
    Object.entries(spec).map(([name, color]) => [name, { color, mesh: builder() }]),
  );
}

// ---------------------------------------------------------------------------
// Paredes de reboco
// ---------------------------------------------------------------------------

const HALF_W = WALL.width / 2;

/** Reboco com um vão (ou sem); o vão corta a parede inteira na espessura. */
function plasterCore(mesh, opening) {
  const z = { z0: -WALL.half, z1: WALL.half };
  const top = WALL.height;
  if (!opening) {
    mesh.box({ x0: -HALF_W, x1: HALF_W, y0: 0, y1: top, ...z }, ['ny']);
    return;
  }
  const { x0, x1, y0, y1 } = opening;
  mesh.box({ x0: -HALF_W, x1: x0, y0: 0, y1: top, ...z }, ['ny', 'px']);
  mesh.box({ x0: x1, x1: HALF_W, y0: 0, y1: top, ...z }, ['ny', 'nx']);
  if (y0 > 0) mesh.box({ x0, x1, y0: 0, y1: y0, ...z }, ['ny', 'px', 'nx']);
  mesh.box({ x0, x1, y0: y1, y1: top, ...z }, ['px', 'nx']);
  // Faces de dentro do vão (o "peitoril" e as laterais aparecem de perto).
  mesh.box({ x0: x0 - 0.001, x1: x0, y0, y1, ...z }, ['nx', 'py', 'ny', 'pz', 'nz']);
  mesh.box({ x0: x1, x1: x1 + 0.001, y0, y1, ...z }, ['px', 'py', 'ny', 'pz', 'nz']);
}

/** Rodapé, cortado pela porta quando houver. */
function baseboard(mesh, door) {
  const z = { z0: -BASEBOARD.half, z1: BASEBOARD.half };
  const spans = door
    ? [
        [-HALF_W, door.x0],
        [door.x1, HALF_W],
      ]
    : [[-HALF_W, HALF_W]];
  for (const [x0, x1] of spans) mesh.box({ x0, x1, y0: 0, y1: BASEBOARD.height, ...z }, ['ny']);
}

function frieze(mesh) {
  mesh.box(
    { x0: -HALF_W, x1: HALF_W, y0: FRIEZE.y0, y1: WALL.height, z0: -FRIEZE.half, z1: FRIEZE.half },
    ['ny'],
  );
}

/** Moldura retangular em volta de um vão, com a mesma profundidade da parede. */
function frameAround(mesh, { x0, x1, y0, y1 }, bottom) {
  const z = { z0: -WALL.half - 0.008, z1: WALL.half + 0.008 };
  mesh.box({ x0: x0 - FRAME, x1: x0, y0, y1: y1 + FRAME, ...z });
  mesh.box({ x0: x1, x1: x1 + FRAME, y0, y1: y1 + FRAME, ...z });
  mesh.box({ x0, x1, y0: y1, y1: y1 + FRAME, ...z });
  if (bottom) mesh.box({ x0, x1, y0: y0 - FRAME, y1: y0, ...z });
}

function windowWall(parts) {
  plasterCore(parts.plaster.mesh, WINDOW);
  const { x0, x1, y0, y1 } = WINDOW;
  frameAround(parts.trim.mesh, WINDOW, true);
  // Peitoril saltado e travessa no meio, como na janela de tijolo.
  parts.trim.mesh.box({
    x0: x0 - 0.05,
    x1: x1 + 0.05,
    y0: y0 - 0.06,
    y1: y0 - FRAME,
    z0: -WALL.half - 0.03,
    z1: WALL.half + 0.03,
  });
  const middle = (y0 + y1) / 2;
  parts.trim.mesh.box({ x0, x1, y0: middle - 0.012, y1: middle + 0.012, z0: -0.012, z1: 0.012 });
  parts.trim.mesh.box({ x0: -0.012, x1: 0.012, y0, y1, z0: -0.012, z1: 0.012 });
  parts.glass.mesh.box({ x0, x1, y0, y1, z0: -0.004, z1: 0.004 }, ['px', 'nx', 'py', 'ny']);
  // Venezianas abertas dos dois lados da janela, nas duas faces, com ripas em relevo.
  const shutterY = { y0: y0 - FRAME, y1: y1 + FRAME };
  for (const side of [1, -1]) {
    const zFace = side * (WALL.half + 0.002);
    const zOut = side * (WALL.half + SHUTTER.out);
    const z = side === 1 ? { z0: zFace, z1: zOut } : { z0: zOut, z1: zFace };
    for (const [sx0, sx1] of [
      [x0 - FRAME - SHUTTER.gap - SHUTTER.width, x0 - FRAME - SHUTTER.gap],
      [x1 + FRAME + SHUTTER.gap, x1 + FRAME + SHUTTER.gap + SHUTTER.width],
    ]) {
      parts.shutter.mesh.box({ x0: sx0, x1: sx1, ...shutterY, ...z });
      const slats = 8;
      const step = (shutterY.y1 - shutterY.y0) / slats;
      for (let slat = 1; slat < slats; slat += 1) {
        const y = shutterY.y0 + slat * step;
        const slatZ = side === 1 ? { z0: zOut, z1: zOut + 0.008 } : { z0: zOut - 0.008, z1: zOut };
        parts.shutter.mesh.box(
          { x0: sx0 + 0.012, x1: sx1 - 0.012, y0: y - 0.01, y1: y + 0.006, ...slatZ },
          ['ny'],
        );
      }
    }
  }
  baseboard(parts.base.mesh, null);
  frieze(parts.trim.mesh);
}

function doorWall(parts) {
  const opening = { x0: DOOR.x0, x1: DOOR.x1, y0: 0, y1: DOOR.y1 };
  plasterCore(parts.plaster.mesh, opening);
  frameAround(parts.trim.mesh, opening, false);
  // Folha de madeira com almofadas em relevo e maçaneta nos dois lados.
  const leaf = { x0: DOOR.x0, x1: DOOR.x1, y0: 0, y1: DOOR.y1, z0: -0.02, z1: 0.02 };
  parts.wood.mesh.box(leaf, ['ny']);
  for (const side of [1, -1]) {
    const z = side === 1 ? { z0: 0.02, z1: 0.032 } : { z0: -0.032, z1: -0.02 };
    for (const [py0, py1] of [
      [0.14, 0.62],
      [0.76, 1.32],
    ]) {
      parts.wood.mesh.box({ x0: DOOR.x0 + 0.07, x1: DOOR.x1 - 0.07, y0: py0, y1: py1, ...z }, []);
    }
    const knob = side === 1 ? { z0: 0.032, z1: 0.06 } : { z0: -0.06, z1: -0.032 };
    parts.metal.mesh.box({ x0: DOOR.x1 - 0.1, x1: DOOR.x1 - 0.065, y0: 0.66, y1: 0.7, ...knob });
  }
  // Marquise pequena por cima da porta, saltada dos dois lados.
  parts.trim.mesh.box({
    x0: -AWNING.halfX,
    x1: AWNING.halfX,
    y0: AWNING.y0,
    y1: AWNING.y1,
    z0: -WALL.half - AWNING.out,
    z1: WALL.half + AWNING.out,
  });
  baseboard(parts.base.mesh, DOOR);
  frieze(parts.trim.mesh);
}

function plainWall(parts) {
  plasterCore(parts.plaster.mesh, null);
  baseboard(parts.base.mesh, null);
  frieze(parts.trim.mesh);
}

// ---------------------------------------------------------------------------
// Telhado de duas águas: a cumeeira corre em z, as águas descem para os lados em x
// (como os telhados do medieval), e o oitão fecha as duas pontas.
// ---------------------------------------------------------------------------

function gableRoof(parts, width, depth) {
  const half = width / 2;
  const rise = half * ROOF_PITCH;
  const slope = rise / half;
  const outX = half + ROOF.eave;
  const eaveY = -ROOF.eave * slope;
  const zEnd = depth / 2 + ROOF.gableOut;
  const tiles = parts.tile.mesh;
  const trim = parts.trim.mesh;
  for (const side of [1, -1]) {
    // A água em fiadas: cada fiada é uma faixa com a borda de baixo levantada (o degrau da telha).
    for (let row = 0; row < ROOF.rows; row += 1) {
      const t0 = row / ROOF.rows;
      const t1 = (row + 1) / ROOF.rows;
      const x0 = side * outX * (1 - t0);
      const x1 = side * outX * (1 - t1);
      const y0 = eaveY + (rise - eaveY) * t0 + ROOF.thickness + ROOF.lip;
      const y1 = eaveY + (rise - eaveY) * t1 + ROOF.thickness;
      const a = [x0, y0, zEnd];
      const b = [x0, y0, -zEnd];
      const c = [x1, y1, -zEnd];
      const d = [x1, y1, zEnd];
      if (side === 1) tiles.quad(a, b, c, d);
      else tiles.quad(b, a, d, c);
      // O degrau: a face que olha para baixo da água, na borda de cada fiada.
      const lowY = y0 - ROOF.lip;
      const e = [x0, lowY, zEnd];
      const f = [x0, lowY, -zEnd];
      if (side === 1) tiles.quad(e, f, b, a);
      else tiles.quad(f, e, a, b);
    }
    // Forro por baixo da água (aparece no beiral).
    const under = [
      [side * outX, eaveY, -zEnd],
      [side * outX, eaveY, zEnd],
      [0, rise, zEnd],
      [0, rise, -zEnd],
    ];
    if (side === 1) trim.quad(...under);
    else trim.quad(under[1], under[0], under[3], under[2]);
    // Testeira na ponta do beiral.
    const topY = eaveY + ROOF.thickness + ROOF.lip;
    const front = [
      [side * outX, eaveY, zEnd],
      [side * outX, eaveY, -zEnd],
      [side * outX, topY, -zEnd],
      [side * outX, topY, zEnd],
    ];
    if (side === 1) trim.quad(...front);
    else trim.quad(front[1], front[0], front[3], front[2]);
  }
  // Pontas: a borda das águas e o oitão (triângulo de reboco no plano da parede).
  for (const end of [1, -1]) {
    const zFace = end * zEnd;
    const top = rise + ROOF.thickness + ROOF.lip;
    const edge = [
      [outX, eaveY, zFace],
      [outX, eaveY + ROOF.thickness + ROOF.lip, zFace],
      [0, top, zFace],
      [-outX, eaveY + ROOF.thickness + ROOF.lip, zFace],
      [-outX, eaveY, zFace],
      [0, rise, zFace],
    ];
    const [p0, p1, p2, p3, p4, p5] = end === 1 ? edge : edge.map(([x, y, z]) => [-x, y, z]);
    trim.quad(p0, p1, p2, p5);
    trim.quad(p5, p2, p3, p4);
    const zWall = end * (depth / 2);
    const gable = [
      [-half, 0, zWall],
      [half, 0, zWall],
      [0, rise, zWall],
    ];
    // As duas faces: o oitão é visto de fora e, pela casa sem teto de cima, de dentro.
    parts.gable.mesh.tri(...gable);
    parts.gable.mesh.tri(gable[1], gable[0], gable[2]);
  }
  // Cumeeira.
  const top = rise + ROOF.thickness + ROOF.lip;
  parts.ridge.mesh.box({
    x0: -0.05,
    x1: 0.05,
    y0: top - 0.02,
    y1: top + 0.045,
    z0: -zEnd,
    z1: zEnd,
  });
}

// ---------------------------------------------------------------------------
// Quintal: cerca, arbusto e caixa de correio
// ---------------------------------------------------------------------------

/** Cerca de ripas ao longo de x, no meio da casa em z (encaixa como uma parede). */
function picketFence(parts) {
  const wood = parts.paint.mesh;
  const pickets = 6;
  const step = 1 / pickets;
  for (let index = 0; index < pickets; index += 1) {
    const cx = -0.5 + step * (index + 0.5);
    const x0 = cx - 0.04;
    const x1 = cx + 0.04;
    wood.box({ x0, x1, y0: 0, y1: 0.52, z0: -0.012, z1: 0.012 }, ['ny', 'py']);
    // Ponta da ripa.
    wood.tri([x0, 0.52, 0.012], [x1, 0.52, 0.012], [cx, 0.6, 0.012]);
    wood.tri([x1, 0.52, -0.012], [x0, 0.52, -0.012], [cx, 0.6, -0.012]);
    wood.quad([x1, 0.52, 0.012], [x1, 0.52, -0.012], [cx, 0.6, -0.012], [cx, 0.6, 0.012]);
    wood.quad([x0, 0.52, -0.012], [x0, 0.52, 0.012], [cx, 0.6, 0.012], [cx, 0.6, -0.012]);
  }
  for (const y of [0.12, 0.4])
    wood.box({ x0: -0.5, x1: 0.5, y0: y, y1: y + 0.05, z0: -0.03, z1: -0.012 });
}

/** Icosaedro achatado (bola de folhas low-poly). */
function blob(mesh, [cx, cy, cz], [rx, ry, rz]) {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];
  const length = Math.hypot(1, t);
  const points = raw.map(([x, y, z]) => [
    cx + (x / length) * rx,
    cy + (y / length) * ry,
    cz + (z / length) * rz,
  ]);
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  for (const [a, b, c] of faces) mesh.tri(points[a], points[b], points[c]);
}

function bush(parts) {
  blob(parts.leaf.mesh, [0, 0.26, 0], [0.36, 0.28, 0.34]);
  blob(parts.leaf.mesh, [0.18, 0.2, 0.12], [0.24, 0.2, 0.22]);
  blob(parts.leafDark.mesh, [-0.17, 0.19, -0.1], [0.25, 0.2, 0.24]);
  blob(parts.leafDark.mesh, [0.05, 0.42, -0.05], [0.2, 0.16, 0.2]);
}

function mailbox(parts) {
  parts.post.mesh.box({ x0: -0.03, x1: 0.03, y0: 0, y1: 0.62, z0: -0.03, z1: 0.03 }, ['ny']);
  parts.box.mesh.box({ x0: -0.09, x1: 0.09, y0: 0.62, y1: 0.78, z0: -0.17, z1: 0.17 });
  parts.box.mesh.box({ x0: -0.07, x1: 0.07, y0: 0.78, y1: 0.82, z0: -0.17, z1: 0.17 }, ['ny']);
  parts.flag.mesh.box({ x0: 0.09, x1: 0.105, y0: 0.7, y1: 0.86, z0: 0.02, z1: 0.06 });
  parts.flag.mesh.box({ x0: 0.09, x1: 0.105, y0: 0.82, y1: 0.86, z0: 0.06, z1: 0.14 });
}

// ---------------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------------

async function write(key, parts) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const mesh = doc.createMesh(key);
  let triangles = 0;
  for (const [name, { color, mesh: data }] of Object.entries(parts)) {
    if (data.positions.length === 0) continue;
    const glass = name === 'glass';
    const material = doc
      .createMaterial(`MI_${name}`)
      .setBaseColorFactor([...linear(color), glass ? 0.45 : 1])
      .setMetallicFactor(name === 'metal' ? 0.6 : 0)
      .setRoughnessFactor(glass ? 0.15 : 0.9);
    if (glass) material.setAlphaMode('BLEND');
    mesh.addPrimitive(
      doc
        .createPrimitive()
        .setMaterial(material)
        .setAttribute(
          'POSITION',
          doc
            .createAccessor()
            .setType('VEC3')
            .setArray(new Float32Array(data.positions))
            .setBuffer(buffer),
        )
        .setAttribute(
          'NORMAL',
          doc
            .createAccessor()
            .setType('VEC3')
            .setArray(new Float32Array(data.normals))
            .setBuffer(buffer),
        ),
    );
    triangles += data.positions.length / 9;
  }
  doc.createScene().addChild(doc.createNode(key).setMesh(mesh));
  await doc.transform(
    weld(),
    dedup({ propertyTypes: [PropertyType.ACCESSOR] }),
    prune(),
    quantize({ pattern: /^(POSITION|NORMAL)$/, quantizePosition: 16, quantizeNormal: 8 }),
    reorder({ encoder: MeshoptEncoder }),
  );
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  doc
    .getRoot()
    .listBuffers()
    .forEach((item) => item.setURI(`${key}.bin`));
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const { json, resources } = await io.writeJSON(doc, { basename: key });
  writeFileSync(join(OUT, `${key}.gltf`), JSON.stringify(json));
  for (const [name, bytes] of Object.entries(resources)) writeFileSync(join(OUT, name), bytes);
  console.log(key, 'triângulos', triangles);
}

await MeshoptEncoder.ready;

for (const { key, plaster, shutter } of PLASTERS) {
  const base = shade(plaster, 0.62);
  const wallLayers = () =>
    layers({
      plaster,
      base,
      trim: TRIM,
      glass: GLASS,
      shutter,
      wood: WOOD,
      metal: [190, 170, 110],
    });
  const plain = wallLayers();
  plainWall(plain);
  await write(`mod-reboco-${key}`, plain);
  const windowed = wallLayers();
  windowWall(windowed);
  await write(`mod-reboco-${key}-janela`, windowed);
  const door = wallLayers();
  doorWall(door);
  await write(`mod-reboco-${key}-porta`, door);
}

for (const { key, tile } of ROOF_COLORS) {
  for (const [width, depth] of [
    [2, 2],
    [2, 4],
    [4, 4],
  ]) {
    const parts = layers({ tile, trim: TRIM, gable: [232, 228, 218], ridge: shade(tile, 0.7) });
    gableRoof(parts, width, depth);
    await write(`mod-telhado-${key}-${width}x${depth}`, parts);
  }
}

const fence = layers({ paint: TRIM });
picketFence(fence);
await write('mod-cerca-branca', fence);

const shrub = layers({ leaf: [92, 138, 70], leafDark: [64, 108, 56] });
bush(shrub);
await write('mod-arbusto', shrub);

const mail = layers({ post: WOOD, box: [70, 74, 82], flag: [196, 52, 44] });
mailbox(mail);
await write('mod-caixa-correio', mail);
