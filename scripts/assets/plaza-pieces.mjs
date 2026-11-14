// Gera os enfeites de praça (RPG-35): fonte grande (3×3), chafariz (2×2), estátua grande com
// pedestal (2×2), obelisco, banco de pedra e canteiro elevado (2×1). Servem a todos os estilos
// e ao gerador, que monta a praça com jardim, caminhos e bancos em volta do monumento.
// Peças olham para +z; o pedestal e a fonte são simétricos, então girar só muda a estátua.
// uso: node scripts/assets/plaza-pieces.mjs <public/assets/plaza>
import { mkdirSync } from 'node:fs';
import { layers, shade, writePiece } from './piece-mesh.mjs';
import { blob, random, segment } from './organic-mesh.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) throw new Error('uso: node scripts/assets/plaza-pieces.mjs <public/assets/plaza>');
mkdirSync(OUT, { recursive: true });

const STONE = [150, 144, 132];
const STONE_DARK = shade(STONE, 0.75);
const WATER = { color: [70, 128, 168], opacity: 0.82 };
// Bronze velho, esverdeado: a estátua não some contra a pedra do pedestal.
const BRONZE = [86, 126, 108];
const SOIL = [78, 58, 42];
const LEAF = [66, 112, 60];
const PETALS = [
  [206, 64, 70],
  [232, 196, 72],
  [168, 96, 188],
];
const WOOD = [128, 86, 52];

/** Caixa centrada em x e z, apoiada em y0. */
const block = (w, d, y0, y1, cx = 0, cz = 0) => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  y0,
  y1,
  z0: cz - d / 2,
  z1: cz + d / 2,
});

/** Bacia: anel de borda (parede de `sides` lados) com água por dentro. */
function basin(p, { radius, height, wall, sides, water }) {
  segment(p.stone.mesh, { from: [0, 0, 0], to: [0, height, 0], r0: radius, r1: radius, sides });
  // O miolo escuro faz o fundo; a água fica logo abaixo da borda, por cima dele.
  segment(p.dark.mesh, {
    from: [0, height, 0],
    to: [0, height + 0.005, 0],
    r0: radius - wall,
    r1: radius - wall,
    sides,
  });
  segment(p.water.mesh, {
    from: [0, height + 0.006, 0],
    to: [0, height + 0.01 + water, 0],
    r0: radius - wall,
    r1: radius - wall,
    sides,
  });
}

async function fountain() {
  const p = layers({ stone: STONE, dark: STONE_DARK, water: WATER });
  basin(p, { radius: 1.38, height: 0.42, wall: 0.16, sides: 8, water: 0.02 });
  segment(p.stone.mesh, { from: [0, 0.42, 0], to: [0, 1.15, 0], r0: 0.2, r1: 0.15, sides: 8 });
  segment(p.stone.mesh, { from: [0, 1.15, 0], to: [0, 1.3, 0], r0: 0.18, r1: 0.55, sides: 8 });
  segment(p.water.mesh, { from: [0, 1.3, 0], to: [0, 1.32, 0], r0: 0.5, r1: 0.5, sides: 8 });
  segment(p.stone.mesh, { from: [0, 1.3, 0], to: [0, 1.75, 0], r0: 0.09, r1: 0.07, sides: 6 });
  segment(p.stone.mesh, { from: [0, 1.75, 0], to: [0, 1.85, 0], r0: 0.07, r1: 0.22, sides: 6 });
  await writePiece(OUT, 'pra-fonte', p);
}

async function smallFountain() {
  const p = layers({ stone: STONE, dark: STONE_DARK, water: WATER });
  basin(p, { radius: 0.85, height: 0.36, wall: 0.12, sides: 10, water: 0.02 });
  segment(p.stone.mesh, { from: [0, 0.36, 0], to: [0, 0.95, 0], r0: 0.14, r1: 0.1, sides: 8 });
  const rand = random(7);
  blob(p.stone.mesh, { center: [0, 1.05, 0], radius: [0.14, 0.14, 0.14], jitter: 0.05, rand });
  await writePiece(OUT, 'pra-chafariz', p);
}

/** Pedestal em degraus, comum à estátua e ao obelisco. */
function plinth(p, { base, top }) {
  p.dark.mesh.box(block(base, base, 0, 0.2), ['ny']);
  p.stone.mesh.box(block(base - 0.35, base - 0.35, 0.2, 0.45), ['ny']);
  p.stone.mesh.box(block(base - 0.75, base - 0.75, 0.45, top), ['ny']);
  p.dark.mesh.box(block(base - 0.65, base - 0.65, top, top + 0.1), ['ny']);
  return top + 0.1;
}

/** Herói de bronze com a espada erguida, de frente para +z. */
async function bigStatue() {
  const p = layers({ stone: STONE, dark: STONE_DARK, bronze: BRONZE });
  const y = plinth(p, { base: 1.8, top: 1.35 });
  const b = p.bronze.mesh;
  b.box(block(0.16, 0.18, y, y + 0.75, -0.11), ['ny']);
  b.box(block(0.16, 0.18, y, y + 0.75, 0.11), ['ny']);
  b.box(block(0.5, 0.28, y + 0.75, y + 1.35));
  // Capa caída nas costas: placa fina e mais larga embaixo.
  b.box(block(0.56, 0.06, y + 0.35, y + 1.3, 0, -0.17));
  const rand = random(19);
  blob(b, { center: [0, y + 1.52, 0.02], radius: [0.15, 0.17, 0.15], jitter: 0.05, rand });
  // Braço direito para o alto com a espada; o esquerdo segura o escudo na frente.
  segment(b, {
    from: [0.27, y + 1.3, 0],
    to: [0.34, y + 1.85, 0.05],
    r0: 0.07,
    r1: 0.06,
    sides: 5,
  });
  b.box(block(0.2, 0.05, y + 1.86, y + 1.9, 0.34, 0.05));
  b.box(block(0.05, 0.03, y + 1.9, y + 2.55, 0.34, 0.05));
  segment(b, {
    from: [-0.27, y + 1.3, 0],
    to: [-0.3, y + 0.95, 0.12],
    r0: 0.07,
    r1: 0.06,
    sides: 5,
  });
  b.box(block(0.36, 0.05, y + 0.7, y + 1.15, -0.3, 0.18));
  await writePiece(OUT, 'pra-estatua-grande', p);
}

async function obelisk() {
  const p = layers({ stone: STONE, dark: STONE_DARK });
  p.dark.mesh.box(block(0.8, 0.8, 0, 0.18), ['ny']);
  p.stone.mesh.box(block(0.6, 0.6, 0.18, 0.42), ['ny']);
  segment(p.stone.mesh, {
    from: [0, 0.42, 0],
    to: [0, 2.7, 0],
    r0: 0.3,
    r1: 0.18,
    sides: 4,
    twist: Math.PI / 4,
  });
  segment(p.dark.mesh, {
    from: [0, 2.7, 0],
    to: [0, 3.0, 0],
    r0: 0.18,
    r1: 0,
    sides: 4,
    twist: Math.PI / 4,
    caps: false,
  });
  await writePiece(OUT, 'pra-obelisco', p);
}

/** Banco de pedra sem encosto, comprido no eixo x: senta-se de frente para +z ou -z. */
async function stoneBench() {
  const p = layers({ stone: STONE, dark: STONE_DARK, wood: WOOD });
  p.dark.mesh.box(block(0.14, 0.32, 0, 0.36, -0.3), ['ny']);
  p.dark.mesh.box(block(0.14, 0.32, 0, 0.36, 0.3), ['ny']);
  p.stone.mesh.box(block(0.86, 0.38, 0.36, 0.44), []);
  // Tábua do assento por cima da pedra: dá a cor de madeira que lê como "banco" de longe.
  p.wood.mesh.box(block(0.8, 0.3, 0.44, 0.47), ['ny']);
  await writePiece(OUT, 'pra-banco-pedra', p);
}

/** Canteiro elevado de 2 casas (ao longo de x): mureta de pedra, terra e flores. */
async function raisedBed() {
  const p = layers({
    stone: STONE,
    soil: SOIL,
    leaves: LEAF,
    p0: PETALS[0],
    p1: PETALS[1],
    p2: PETALS[2],
  });
  const W = 1.8;
  const D = 0.8;
  const H = 0.36;
  const T = 0.1;
  p.stone.mesh.box(block(W, T, 0, H, 0, -(D - T) / 2), ['ny']);
  p.stone.mesh.box(block(W, T, 0, H, 0, (D - T) / 2), ['ny']);
  p.stone.mesh.box(block(T, D - 2 * T, 0, H, -(W - T) / 2), ['ny']);
  p.stone.mesh.box(block(T, D - 2 * T, 0, H, (W - T) / 2), ['ny']);
  p.soil.mesh.box(block(W - 2 * T, D - 2 * T, 0, H - 0.04), ['ny']);
  const rand = random(29);
  for (const cx of [-0.55, 0.55]) {
    blob(p.leaves.mesh, { center: [cx, H + 0.06, 0], radius: [0.26, 0.16, 0.22], rand });
  }
  for (let i = 0; i < 14; i += 1) {
    const center = [(rand() * 2 - 1) * 0.75, H + 0.06 + rand() * 0.12, (rand() * 2 - 1) * 0.24];
    blob(p[`p${i % 3}`].mesh, { center, radius: [0.05, 0.04, 0.05], jitter: 0.1, rand });
  }
  await writePiece(OUT, 'pra-canteiro', p);
}

await fountain();
await smallFountain();
await bigStatue();
await obelisk();
await stoneBench();
await raisedBed();
