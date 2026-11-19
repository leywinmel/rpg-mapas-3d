// Gera as peças do navio de mapa inteiro (RPG-62): mastro com velas e cesto da gávea, timão,
// canhão na carreta, gurupés da proa e rede de dormir do porão. O casco, o convés e as cabines
// são paredes e pisos do próprio mapa; estas peças são o que não dá para montar com eles.
// Escala do boneco de 1,5 de altura. Cada peça olha para +z e tem a base em y = 0, no convés.
// uso: node scripts/assets/ship-pieces.mjs <public/assets/ship>
import { mkdirSync } from 'node:fs';
import { layers, shade, writePiece } from './piece-mesh.mjs';
import { segment } from './organic-mesh.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) throw new Error('uso: node scripts/assets/ship-pieces.mjs <public/assets/ship>');
mkdirSync(OUT, { recursive: true });

const WOOD = [112, 74, 44];
const WOOD_DARK = shade(WOOD, 0.62);
const SAIL = [226, 214, 186];
const ROPE = [196, 170, 120];
const IRON = [58, 58, 64];
const BRASS = [176, 140, 64];
const CANVAS = [170, 150, 112];
const SHEET_GAP = 0.015;

/** Caixa centrada em x e z, apoiada em y0. */
const block = (w, d, y0, y1, cx = 0, cz = 0) => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  y0,
  y1,
  z0: cz - d / 2,
  z1: cz + d / 2,
});

/** Vela quadrada pendurada numa verga, levemente estufada para a frente (+z). */
function sail(p, { y, width, height, belly }) {
  p.wood.mesh.box(block(width + 0.4, 0.1, y - 0.1, y, 0, 0.12));
  const rows = 4;
  for (let row = 0; row < rows; row += 1) {
    const top = y - 0.12 - (height * row) / rows;
    const bulge = Math.sin(((row + 0.5) / rows) * Math.PI) * belly;
    p.sail.mesh.box({
      x0: -width / 2 + row * 0.04,
      x1: width / 2 - row * 0.04,
      y0: top - height / rows,
      y1: top,
      z0: 0.16 + bulge,
      z1: 0.2 + bulge,
    });
  }
}

/** Mastro de 9 de altura: duas velas, cesto da gávea e cabos até o convés. */
async function mast() {
  const p = layers({ wood: WOOD, dark: WOOD_DARK, sail: SAIL, rope: ROPE });
  p.dark.mesh.box(block(0.5, 0.5, 0, 0.3), ['ny']);
  segment(p.wood.mesh, { from: [0, 0, 0], to: [0, 9, 0], r0: 0.16, r1: 0.09, sides: 8 });
  sail(p, { y: 4.6, width: 4.2, height: 2.4, belly: 0.25 });
  sail(p, { y: 7.4, width: 3.2, height: 1.9, belly: 0.2 });
  // Cesto da gávea: plataforma redonda com parapeito baixo, entre as duas velas.
  segment(p.dark.mesh, { from: [0, 5.0, 0], to: [0, 5.1, 0], r0: 0.55, r1: 0.55, sides: 10 });
  segment(p.wood.mesh, {
    from: [0, 5.1, 0],
    to: [0, 5.45, 0],
    r0: 0.55,
    r1: 0.58,
    sides: 10,
    caps: false,
  });
  // Ovéns: cabos do topo até as bordas do convés, dos dois lados.
  for (const side of [-1, 1]) {
    for (const z of [-0.3, 0, 0.3]) {
      segment(p.rope.mesh, {
        from: [side * 0.12, 5.0, 0],
        to: [side * 1.9, 0.2, z],
        r0: 0.02,
        r1: 0.02,
        sides: 4,
      });
    }
  }
  await writePiece(OUT, 'nav-mastro', p);
}

/** Timão na coluna: o timoneiro fica atrás (-z) e olha para a proa (+z). */
async function wheel() {
  const p = layers({ wood: WOOD, dark: WOOD_DARK, brass: BRASS });
  p.dark.mesh.box(block(0.34, 0.34, 0, 0.9, 0, 0.1), ['ny']);
  p.dark.mesh.box(block(0.44, 0.44, 0, 0.08, 0, 0.1), ['ny']);
  const hub = [0, 1.05, -0.12];
  segment(p.brass.mesh, { from: [0, 1.05, 0.1], to: hub, r0: 0.06, r1: 0.06, sides: 6 });
  const spokes = 8;
  const radius = 0.42;
  for (let index = 0; index < spokes; index += 1) {
    const angle = (index / spokes) * Math.PI * 2;
    const tip = [Math.cos(angle) * (radius + 0.12), 1.05 + Math.sin(angle) * (radius + 0.12)];
    segment(p.wood.mesh, {
      from: hub,
      to: [tip[0], tip[1], -0.12],
      r0: 0.025,
      r1: 0.03,
      sides: 4,
    });
    const next = ((index + 1) / spokes) * Math.PI * 2;
    segment(p.wood.mesh, {
      from: [Math.cos(angle) * radius, 1.05 + Math.sin(angle) * radius, -0.12],
      to: [Math.cos(next) * radius, 1.05 + Math.sin(next) * radius, -0.12],
      r0: 0.035,
      r1: 0.035,
      sides: 4,
    });
  }
  await writePiece(OUT, 'nav-timao', p);
}

/** Canhão de bronze escuro na carreta de madeira, com o cano apontando para +z. */
async function cannon() {
  const p = layers({ wood: WOOD, dark: WOOD_DARK, iron: IRON });
  p.wood.mesh.box(block(0.56, 0.8, 0.1, 0.32, 0, -0.05), ['ny']);
  p.wood.mesh.box(block(0.08, 0.7, 0.32, 0.5, -0.22, -0.08));
  p.wood.mesh.box(block(0.08, 0.7, 0.32, 0.5, 0.22, -0.08));
  for (const [x, z] of [
    [-0.3, -0.32],
    [0.3, -0.32],
    [-0.3, 0.24],
    [0.3, 0.24],
  ]) {
    segment(p.dark.mesh, { from: [x - 0.04, 0.12, z], to: [x + 0.04, 0.12, z], r0: 0.12, r1: 0.12 });
  }
  segment(p.iron.mesh, { from: [0, 0.48, -0.42], to: [0, 0.52, 0.5], r0: 0.15, r1: 0.1, sides: 10 });
  segment(p.iron.mesh, { from: [0, 0.48, -0.42], to: [0, 0.47, -0.5], r0: 0.08, r1: 0.06 });
  await writePiece(OUT, 'nav-canhao', p);
}

/** Gurupés: o mastro deitado que sai da proa, subindo para a frente, com a bujarrona. */
async function bowsprit() {
  const p = layers({ wood: WOOD, sail: SAIL, rope: ROPE });
  const tip = [0, 1.9, 4.2];
  segment(p.wood.mesh, { from: [0, 0.3, -0.3], to: tip, r0: 0.12, r1: 0.06, sides: 8 });
  // Bujarrona: vela triangular do gurupés até o alto, de frente para o vento.
  // Cada face fica um fio afastada da outra: no mesmo plano, a de trás aparece por cima.
  const sheet = (x) => [
    [x, 2.0, 3.9],
    [x, 4.4, 0.3],
    [x, 0.9, 1.0],
  ];
  const [a, b, c] = sheet(SHEET_GAP);
  const [d, e, f] = sheet(-SHEET_GAP);
  p.sail.mesh.tri(a, c, b);
  p.sail.mesh.tri(d, e, f);
  segment(p.rope.mesh, { from: tip, to: [0, 4.6, 0.2], r0: 0.02, r1: 0.02, sides: 4 });
  await writePiece(OUT, 'nav-gurupes', p);
}

/** Rede de dormir do porão, 1×2: dois esteios e o pano em curva entre eles. */
async function hammock() {
  const p = layers({ wood: WOOD_DARK, canvas: CANVAS, rope: ROPE });
  for (const z of [-0.92, 0.92]) p.wood.mesh.box(block(0.12, 0.12, 0, 1.3, 0, z), ['ny']);
  const pieces = 8;
  for (let index = 0; index < pieces; index += 1) {
    const z0 = -0.7 + (1.4 * index) / pieces;
    const z1 = z0 + 1.4 / pieces;
    const mid = (z0 + z1) / 2;
    const sag = 0.62 + (mid / 0.7) ** 2 * 0.38;
    p.canvas.mesh.box({ x0: -0.3, x1: 0.3, y0: sag, y1: sag + 0.04, z0, z1 });
  }
  for (const side of [-1, 1]) {
    segment(p.rope.mesh, {
      from: [0, 1.2, side * 0.88],
      to: [0, 1.0, side * 0.7],
      r0: 0.02,
      r1: 0.02,
      sides: 4,
    });
  }
  await writePiece(OUT, 'nav-rede', p);
}

for (const make of [mast, wheel, cannon, bowsprit, hammock]) await make();
