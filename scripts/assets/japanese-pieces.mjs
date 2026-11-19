// Gera as peças do templo-escola japonês (RPG-64): paredes de madeira escura com reboco branco
// (lisa, com janela de papel e com porta corrediça), telhados de telha escura com o beiral
// curvo, portal torii, lanterna de pedra, cerejeira, bambuzal, pagode de cinco andares,
// campanário com o sino, incensário e boneco de treino. Só a inspiração na arquitetura de
// templo: nada copiado de obra nenhuma.
// Formato igual ao das outras peças: origem no centro do footprint, base em y = 0, uma casa =
// 1 unidade, parede com 1 casa de largura e 2 de altura, e cada peça olha para +z.
// uso: node scripts/assets/japanese-pieces.mjs <public/assets/japanese>
import { mkdirSync } from 'node:fs';
import { MeshoptEncoder } from 'meshoptimizer';
import { glow, layers, shade, wallCore, writePiece } from './piece-mesh.mjs';
import { blob, lean, random, segment } from './organic-mesh.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) throw new Error('uso: node scripts/assets/japanese-pieces.mjs <public/assets/japanese>');
mkdirSync(OUT, { recursive: true });

const WALL = { width: 1, height: 2, half: 0.05 };
const HALF_W = WALL.width / 2;
/** Esteio de madeira nas pontas da parede, viga de cima e soleira: saltam do reboco. */
const POST = { width: 0.09, out: 0.025 };
const BEAM = { y0: 1.84, y1: 2 };
const RAIL = { y0: 0.5, y1: 0.56 };
const SILL = 0.1;
const WINDOW = { x0: -0.3, x1: 0.3, y0: 0.8, y1: 1.6 };
const DOOR = { x0: -0.34, x1: 0.34, y1: 1.62 };
const LATTICE = 0.016;

const WOOD = [70, 44, 32];
const WOOD_LIGHT = [128, 92, 60];
const PLASTER = [228, 222, 206];
const PAPER = [236, 228, 204];
const TILE = [58, 62, 72];
const LACQUER = [176, 46, 34];
const STONE = [138, 134, 124];
const BRONZE = [104, 112, 84];
const GOLD = [196, 160, 72];
const FLAME = [255, 196, 110];
const BLOSSOM = [238, 176, 196];
const BLOSSOM_LIGHT = [248, 206, 218];
const BARK = [84, 58, 50];
const BAMBOO = [128, 162, 78];
const BAMBOO_DARK = [92, 124, 56];
const STRAW = [196, 170, 108];
const ROPE = [214, 196, 150];

/** Caixa centrada em x e z, apoiada em y0. */
const block = (w, d, y0, y1, cx = 0, cz = 0) => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  y0,
  y1,
  z0: cz - d / 2,
  z1: cz + d / 2,
});

// ---------------------------------------------------------------------------
// Paredes: o esqueleto de madeira escura salta dos dois lados do reboco branco.
// ---------------------------------------------------------------------------

function frame(mesh, door) {
  const z = { z0: -WALL.half - POST.out, z1: WALL.half + POST.out };
  mesh.box({ x0: -HALF_W, x1: -HALF_W + POST.width, y0: 0, y1: WALL.height, ...z }, ['ny']);
  mesh.box({ x0: HALF_W - POST.width, x1: HALF_W, y0: 0, y1: WALL.height, ...z }, ['ny']);
  mesh.box({ x0: -HALF_W, x1: HALF_W, y0: BEAM.y0, y1: BEAM.y1, ...z });
  const spans = door
    ? [
        [-HALF_W, door.x0],
        [door.x1, HALF_W],
      ]
    : [[-HALF_W, HALF_W]];
  for (const [x0, x1] of spans) {
    mesh.box({ x0, x1, y0: 0, y1: SILL, ...z }, ['ny']);
    if (!door) mesh.box({ x0, x1, y0: RAIL.y0, y1: RAIL.y1, ...z });
  }
}

/** Grade de papel: o painel claro e as ripas em quadradinhos, iguais nas duas faces. */
function shoji(parts, { x0, x1, y0, y1 }, columns, rows) {
  parts.paper.mesh.box({ x0, x1, y0, y1, z0: -0.006, z1: 0.006 }, ['px', 'nx', 'py', 'ny']);
  const z = { z0: -0.014, z1: 0.014 };
  for (let column = 0; column <= columns; column += 1) {
    const x = x0 + ((x1 - x0) * column) / columns;
    parts.frame.mesh.box({ x0: x - LATTICE / 2, x1: x + LATTICE / 2, y0, y1, ...z });
  }
  for (let row = 0; row <= rows; row += 1) {
    const y = y0 + ((y1 - y0) * row) / rows;
    parts.frame.mesh.box({ x0, x1, y0: y - LATTICE / 2, y1: y + LATTICE / 2, ...z });
  }
}

function plainWall(parts) {
  wallCore(parts.plaster.mesh, WALL, null);
  frame(parts.frame.mesh, null);
}

function windowWall(parts) {
  wallCore(parts.plaster.mesh, WALL, WINDOW);
  frame(parts.frame.mesh, null);
  shoji(parts, WINDOW, 4, 5);
}

/** Porta corrediça aberta: a folha de papel encostada de lado, o vão livre para passar. */
function doorWall(parts) {
  const opening = { x0: DOOR.x0, x1: DOOR.x1, y0: 0, y1: DOOR.y1 };
  wallCore(parts.plaster.mesh, WALL, opening);
  frame(parts.frame.mesh, DOOR);
  const z = { z0: -WALL.half - POST.out, z1: WALL.half + POST.out };
  parts.frame.mesh.box({ x0: DOOR.x0, x1: DOOR.x1, y0: DOOR.y1, y1: DOOR.y1 + 0.07, ...z });
  // A folha corre por fora, na face da frente, cobrindo meio vão.
  const leaf = { x0: DOOR.x0 - 0.02, x1: 0, y0: 0.02, y1: DOOR.y1 - 0.02 };
  const at = WALL.half + POST.out + 0.012;
  parts.paper.mesh.box({ ...leaf, z0: at - 0.006, z1: at + 0.006 });
  for (const x of [leaf.x0, leaf.x1]) {
    parts.frame.mesh.box({ x0: x - 0.02, x1: x + 0.02, y0: leaf.y0, y1: leaf.y1, z0: at - 0.014, z1: at + 0.014 });
  }
  for (let row = 0; row <= 6; row += 1) {
    const y = leaf.y0 + ((leaf.y1 - leaf.y0) * row) / 6;
    parts.frame.mesh.box({ x0: leaf.x0, x1: leaf.x1, y0: y - 0.01, y1: y + 0.01, z0: at - 0.014, z1: at + 0.014 });
  }
}

// ---------------------------------------------------------------------------
// Telhado: duas águas em curva (rasas no beiral, íngremes perto da cumeeira), a cumeeira com
// as pontas levantadas e o oitão de madeira escura. A cumeeira corre em z, como no medieval.
// ---------------------------------------------------------------------------

const ROOF = { eave: 0.42, gableOut: 0.3, rows: 10, thickness: 0.08, lip: 0.02, pitch: 0.95 };
/** A curva da água: quanto do caimento já subiu na fração `t` do beiral à cumeeira. */
const roofCurve = (t) => t ** 1.7;

function curvedRoof(parts, width, depth) {
  const half = width / 2;
  const rise = half * ROOF.pitch;
  const outX = half + ROOF.eave;
  // O beiral desce menos que a reta: a curva deixa a ponta quase reta, um pouco levantada.
  const eaveY = -0.08;
  const zEnd = depth / 2 + ROOF.gableOut;
  const heightAt = (t) => eaveY + (rise - eaveY) * roofCurve(t);
  const tiles = parts.tile.mesh;
  const under = parts.under.mesh;
  for (const side of [1, -1]) {
    for (let row = 0; row < ROOF.rows; row += 1) {
      const t0 = row / ROOF.rows;
      const t1 = (row + 1) / ROOF.rows;
      const x0 = side * outX * (1 - t0);
      const x1 = side * outX * (1 - t1);
      const y0 = heightAt(t0) + ROOF.thickness + ROOF.lip;
      const y1 = heightAt(t1) + ROOF.thickness;
      const a = [x0, y0, zEnd];
      const b = [x0, y0, -zEnd];
      const c = [x1, y1, -zEnd];
      const d = [x1, y1, zEnd];
      if (side === 1) tiles.quad(a, b, c, d);
      else tiles.quad(b, a, d, c);
      const lowY = y0 - ROOF.lip;
      const e = [x0, lowY, zEnd];
      const f = [x0, lowY, -zEnd];
      if (side === 1) tiles.quad(e, f, b, a);
      else tiles.quad(f, e, a, b);
      // Forro por baixo, seguindo a mesma curva (aparece no beiral fundo).
      const u = [
        [x0, heightAt(t0), -zEnd],
        [x0, heightAt(t0), zEnd],
        [x1, heightAt(t1), zEnd],
        [x1, heightAt(t1), -zEnd],
      ];
      if (side === 1) under.quad(...u);
      else under.quad(u[1], u[0], u[3], u[2]);
      // Pontas da fiada: a borda da água vista de lado, nas duas pontas.
      for (const end of [1, -1]) {
        const zFace = end * zEnd;
        const rim = [
          [x0, heightAt(t0), zFace],
          [x0, y0, zFace],
          [x1, y1, zFace],
          [x1, heightAt(t1), zFace],
        ];
        const flip = (end === 1) !== (side === 1);
        if (flip) tiles.quad(rim[1], rim[0], rim[3], rim[2]);
        else tiles.quad(...rim);
      }
    }
    const topY = eaveY + ROOF.thickness + ROOF.lip;
    const front = [
      [side * outX, eaveY, zEnd],
      [side * outX, eaveY, -zEnd],
      [side * outX, topY, -zEnd],
      [side * outX, topY, zEnd],
    ];
    if (side === 1) under.quad(...front);
    else under.quad(front[1], front[0], front[3], front[2]);
  }
  // Oitão de madeira escura, no plano da parede, nas duas faces; tábua branca de enfeite.
  for (const end of [1, -1]) {
    const zWall = end * (depth / 2);
    const steps = 8;
    for (let step = 0; step < steps; step += 1) {
      const t0 = step / steps;
      const t1 = (step + 1) / steps;
      const xa = half * (1 - t0);
      const xb = half * (1 - t1);
      const ya = Math.max(0, heightAt(1 - xa / outX));
      const yb = Math.max(0, heightAt(1 - xb / outX));
      for (const quad of [
        [
          [-xa, 0, zWall],
          [xa, 0, zWall],
          [xb, yb, zWall],
          [-xb, yb, zWall],
        ],
      ]) {
        parts.gable.mesh.quad(...quad);
        parts.gable.mesh.quad(quad[1], quad[0], quad[3], quad[2]);
      }
      if (step === 0) continue;
      const band = { x0: -xa, x1: xa, y0: ya - 0.03, y1: ya, z0: zWall - 0.012, z1: zWall + 0.012 };
      if (step % 3 === 0) parts.trim.mesh.box(band);
    }
  }
  // Cumeeira com as pontas levantadas (as telhas de enfeite).
  const top = rise + ROOF.thickness + ROOF.lip;
  parts.ridge.mesh.box({ x0: -0.07, x1: 0.07, y0: top - 0.03, y1: top + 0.08, z0: -zEnd, z1: zEnd });
  for (const end of [1, -1]) {
    const z = end * (zEnd - 0.06);
    parts.ridge.mesh.box(block(0.2, 0.14, top, top + 0.24, 0, z));
    parts.ridge.mesh.box(block(0.12, 0.2, top + 0.18, top + 0.3, 0, z + end * 0.05));
  }
}

// ---------------------------------------------------------------------------
// Peças soltas
// ---------------------------------------------------------------------------

/** Torii 3×1: dois postes vermelhos, a travessa de baixo e a de cima com as pontas erguidas. */
function torii(parts) {
  const lacquer = parts.lacquer.mesh;
  for (const x of [-1.05, 1.05]) {
    segment(lacquer, { from: [x, 0, 0], to: [x * 0.96, 2.35, 0], r0: 0.11, r1: 0.09, sides: 10 });
    parts.dark.mesh.box(block(0.3, 0.3, 0, 0.2, x, 0));
  }
  lacquer.box(block(2.7, 0.14, 1.86, 2.02));
  lacquer.box(block(0.16, 0.12, 2.02, 2.36));
  // Travessa de cima: três trechos, as pontas subindo como a quilha de um barco.
  const top = parts.dark.mesh;
  const pieces = [
    [-1.65, -1.05, 2.42, 2.36],
    [-1.05, 1.05, 2.36, 2.36],
    [1.05, 1.65, 2.36, 2.42],
  ];
  for (const [x0, x1, ya, yb] of pieces) {
    const depth = 0.2;
    const thick = 0.14;
    const quads = [
      [[x0, ya + thick, depth], [x1, yb + thick, depth], [x1, yb + thick, -depth], [x0, ya + thick, -depth]],
      [[x0, ya, -depth], [x1, yb, -depth], [x1, yb, depth], [x0, ya, depth]],
      [[x0, ya, depth], [x1, yb, depth], [x1, yb + thick, depth], [x0, ya + thick, depth]],
      [[x1, yb, -depth], [x0, ya, -depth], [x0, ya + thick, -depth], [x1, yb + thick, -depth]],
    ];
    for (const quad of quads) top.quad(...quad);
  }
  for (const x of [-1.65, 1.65]) {
    const side = Math.sign(x);
    const at = [x, 2.42, -0.2];
    const quad = [at, [x, 2.42, 0.2], [x, 2.56, 0.2], [x, 2.56, -0.2]];
    if (side > 0) top.quad(...quad);
    else top.quad(quad[1], quad[0], quad[3], quad[2]);
  }
  lacquer.box(block(3.24, 0.24, 2.24, 2.36));
  parts.gold.mesh.box(block(0.26, 0.04, 2.06, 2.3, 0, 0.08));
}

/** Lanterna de pedra: base, haste, a casinha da luz acesa, o chapéu e a ponta. */
function lantern(parts) {
  const stone = parts.stone.mesh;
  stone.box(block(0.46, 0.46, 0, 0.12));
  segment(stone, { from: [0, 0.12, 0], to: [0, 0.62, 0], r0: 0.09, r1: 0.08, sides: 6 });
  stone.box(block(0.38, 0.38, 0.62, 0.7));
  stone.box(block(0.3, 0.3, 0.7, 0.96), ['ny']);
  parts.light.mesh.box(block(0.2, 0.32, 0.76, 0.9));
  parts.light.mesh.box(block(0.32, 0.2, 0.76, 0.9));
  segment(stone, { from: [0, 0.96, 0], to: [0, 1.14, 0], r0: 0.34, r1: 0.04, sides: 6 });
  stone.box(block(0.08, 0.08, 1.12, 1.24));
}

function sakura(parts, rand) {
  segment(parts.bark.mesh, { from: [0, 0, 0], to: lean([0, 0, 0], 0.9, 0.12, 0.4), r0: 0.12, r1: 0.08 });
  const fork = lean([0, 0, 0], 0.9, 0.12, 0.4);
  for (const [tilt, heading, length] of [
    [0.7, 0.2, 0.7],
    [0.6, 2.3, 0.65],
    [0.5, 4.2, 0.6],
  ]) {
    segment(parts.bark.mesh, { from: fork, to: lean(fork, length, tilt, heading), r0: 0.06, r1: 0.03 });
  }
  const crowns = [
    [[0, 1.55, 0], [0.62, 0.42, 0.62], 'bloom'],
    [[0.42, 1.38, 0.18], [0.4, 0.3, 0.38], 'light'],
    [[-0.38, 1.4, -0.12], [0.42, 0.32, 0.4], 'bloom'],
    [[0.06, 1.42, -0.42], [0.36, 0.28, 0.34], 'light'],
    [[-0.1, 1.85, 0.12], [0.36, 0.26, 0.34], 'light'],
  ];
  for (const [center, radius, layer] of crowns) blob(parts[layer].mesh, { center, radius, rand });
  // Pétalas caídas em volta do tronco.
  for (let index = 0; index < 10; index += 1) {
    const angle = rand() * Math.PI * 2;
    const r = 0.2 + rand() * 0.25;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    parts.light.mesh.box(block(0.05, 0.05, 0, 0.008, x, z));
  }
}

function bamboo(parts, rand) {
  for (let index = 0; index < 9; index += 1) {
    const angle = rand() * Math.PI * 2;
    const r = 0.06 + rand() * 0.3;
    const base = [Math.cos(angle) * r, 0, Math.sin(angle) * r];
    const height = 2.1 + rand() * 0.9;
    const tip = lean(base, height, 0.03 + rand() * 0.08, angle);
    const mesh = index % 2 ? parts.cane.mesh : parts.dark.mesh;
    const knots = 5;
    for (let knot = 0; knot < knots; knot += 1) {
      const from = base.map((v, i) => v + ((tip[i] - v) * knot) / knots);
      const to = base.map((v, i) => v + ((tip[i] - v) * (knot + 1)) / knots);
      segment(mesh, { from, to, r0: 0.032, r1: 0.028, sides: 5 });
      segment(parts.dark.mesh, { from: to, to: to.map((v, i) => (i === 1 ? v + 0.02 : v)), r0: 0.038, r1: 0.038, sides: 5 });
    }
    blob(parts.leaf.mesh, { center: lean(tip, 0.05, 0, 0), radius: [0.2, 0.16, 0.2], rand });
  }
}

/** Pagode 3×3 de cinco andares: cada andar menor, com o beiral largo e o mastro no topo. */
function pagoda(parts) {
  parts.stone.mesh.box(block(2.9, 2.9, 0, 0.24));
  let y = 0.24;
  for (let floor = 0; floor < 5; floor += 1) {
    const body = 1.9 - floor * 0.26;
    const tall = floor === 0 ? 0.95 : 0.62;
    parts.wall.mesh.box(block(body, body, y, y + tall), ['ny']);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.lacquer.mesh.box(block(0.1, 0.1, y, y + tall, (sx * body) / 2, (sz * body) / 2));
      }
    }
    if (floor === 0) {
      for (const z of [body / 2 + 0.01, -body / 2 - 0.01]) {
        parts.dark.mesh.box(block(0.5, 0.02, y, y + 0.7, 0, z));
      }
    }
    y += tall;
    // Beiral: uma laje larga que afina para cima, com as pontas um pouco erguidas.
    const eave = body + 0.9;
    parts.tile.mesh.box(block(eave, eave, y, y + 0.08));
    segment(parts.tile.mesh, {
      from: [0, y + 0.08, 0],
      to: [0, y + 0.34, 0],
      r0: (eave / 2) * Math.SQRT2,
      r1: (body / 2) * 0.8,
      sides: 4,
      twist: Math.PI / 4,
    });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.tile.mesh.box(block(0.12, 0.12, y + 0.02, y + 0.16, (sx * eave) / 2, (sz * eave) / 2));
      }
    }
    y += 0.3;
  }
  segment(parts.gold.mesh, { from: [0, y, 0], to: [0, y + 1.1, 0], r0: 0.05, r1: 0.03, sides: 6 });
  for (let ring = 0; ring < 6; ring += 1) {
    const ry = y + 0.2 + ring * 0.14;
    segment(parts.gold.mesh, { from: [0, ry, 0], to: [0, ry + 0.03, 0], r0: 0.12, r1: 0.12, sides: 8 });
  }
}

/** Campanário 2×2: quatro esteios, telhadinho e o sino de bronze com o tronco que bate. */
function bellTower(parts) {
  parts.stone.mesh.box(block(1.9, 1.9, 0, 0.3));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      segment(parts.lacquer.mesh, { from: [sx * 0.7, 0.3, sz * 0.7], to: [sx * 0.7, 2.2, sz * 0.7], r0: 0.07, r1: 0.06, sides: 8 });
    }
  }
  parts.dark.mesh.box(block(1.6, 1.6, 2.1, 2.22));
  parts.tile.mesh.box(block(2.2, 2.2, 2.22, 2.3));
  segment(parts.tile.mesh, { from: [0, 2.3, 0], to: [0, 2.85, 0], r0: 1.5, r1: 0.12, sides: 4, twist: Math.PI / 4 });
  parts.dark.mesh.box(block(0.08, 0.08, 1.84, 2.1));
  segment(parts.bronze.mesh, { from: [0, 1.84, 0], to: [0, 1.0, 0], r0: 0.18, r1: 0.3, sides: 12 });
  parts.bronze.mesh.box(block(0.66, 0.66, 0.96, 1.02));
  segment(parts.wood.mesh, { from: [-0.75, 1.3, 0.38], to: [-0.2, 1.3, 0.38], r0: 0.07, r1: 0.07, sides: 6 });
  parts.rope.mesh.box(block(0.02, 0.02, 1.3, 2.1, -0.6, 0.38));
}

/** Incensário de bronze no pátio: a bacia com pés, a tampa e a fumaça clarinha. */
function incense(parts) {
  for (const [x, z] of [
    [-0.2, -0.2],
    [0.2, -0.2],
    [0, 0.24],
  ]) {
    parts.bronze.mesh.box(block(0.08, 0.08, 0, 0.18, x, z));
  }
  segment(parts.bronze.mesh, { from: [0, 0.16, 0], to: [0, 0.52, 0], r0: 0.22, r1: 0.34, sides: 10 });
  parts.bronze.mesh.box(block(0.58, 0.58, 0.52, 0.56));
  segment(parts.bronze.mesh, { from: [0, 0.56, 0], to: [0, 0.8, 0], r0: 0.24, r1: 0.06, sides: 8 });
  parts.gold.mesh.box(block(0.07, 0.07, 0.8, 0.88));
  parts.ember.mesh.box(block(0.2, 0.2, 0.5, 0.53));
}

/** Boneco de treino: o poste com os dois braços de pau e a palha amarrada no meio. */
function dummy(parts) {
  parts.wood.mesh.box(block(0.3, 0.3, 0, 0.08));
  segment(parts.wood.mesh, { from: [0, 0.08, 0], to: [0, 1.5, 0], r0: 0.09, r1: 0.08, sides: 8 });
  segment(parts.straw.mesh, { from: [0, 0.75, 0], to: [0, 1.25, 0], r0: 0.15, r1: 0.14, sides: 8 });
  for (const y of [0.8, 1.2]) {
    segment(parts.rope.mesh, { from: [0, y, 0], to: [0, y + 0.03, 0], r0: 0.155, r1: 0.155, sides: 8 });
  }
  for (const y of [1.05, 1.32]) {
    segment(parts.wood.mesh, { from: [-0.34, y, 0.06], to: [0.34, y, 0.06], r0: 0.035, r1: 0.035, sides: 6 });
  }
  blob(parts.straw.mesh, { center: [0, 1.6, 0], radius: [0.13, 0.15, 0.13], rand: random(9), jitter: 0.08 });
}

await MeshoptEncoder.ready;

const wallLayers = () => layers({ plaster: PLASTER, frame: WOOD, paper: PAPER });
const plain = wallLayers();
plainWall(plain);
await writePiece(OUT, 'jap-parede', plain);
const windowed = wallLayers();
windowWall(windowed);
await writePiece(OUT, 'jap-parede-janela', windowed);
const door = wallLayers();
doorWall(door);
await writePiece(OUT, 'jap-parede-porta', door);

for (const [width, depth] of [
  [2, 2],
  [2, 4],
  [4, 4],
]) {
  const parts = layers({
    tile: TILE,
    under: shade(WOOD, 0.9),
    gable: WOOD,
    trim: PLASTER,
    ridge: shade(TILE, 0.7),
  });
  curvedRoof(parts, width, depth);
  await writePiece(OUT, `jap-telhado-${width}x${depth}`, parts);
}

const gate = layers({ lacquer: LACQUER, dark: [40, 34, 32], gold: GOLD });
torii(gate);
await writePiece(OUT, 'jap-torii', gate);

const lamp = layers({ stone: STONE, light: glow(FLAME) });
lantern(lamp);
await writePiece(OUT, 'jap-lanterna', lamp);

const cherry = layers({ bark: BARK, bloom: BLOSSOM, light: BLOSSOM_LIGHT });
sakura(cherry, random(31));
await writePiece(OUT, 'jap-sakura', cherry);

const grove = layers({ cane: BAMBOO, dark: BAMBOO_DARK, leaf: [86, 132, 62] });
bamboo(grove, random(47));
await writePiece(OUT, 'jap-bambu', grove);

const tower = layers({
  stone: STONE,
  wall: PLASTER,
  lacquer: LACQUER,
  dark: WOOD,
  tile: TILE,
  gold: GOLD,
});
pagoda(tower);
await writePiece(OUT, 'jap-pagode', tower);

const belfry = layers({
  stone: STONE,
  lacquer: LACQUER,
  dark: WOOD,
  tile: TILE,
  bronze: BRONZE,
  wood: WOOD_LIGHT,
  rope: ROPE,
});
bellTower(belfry);
await writePiece(OUT, 'jap-campanario', belfry);

const burner = layers({ bronze: BRONZE, gold: GOLD, ember: glow([255, 120, 50]) });
incense(burner);
await writePiece(OUT, 'jap-incensario', burner);

const post = layers({ wood: WOOD_LIGHT, straw: STRAW, rope: ROPE });
dummy(post);
await writePiece(OUT, 'jap-boneco-treino', post);
