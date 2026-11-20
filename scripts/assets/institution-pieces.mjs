// Gera os móveis e adereços de escola e hospital (RPG-65): na escola, carteira com cadeira,
// mesa do professor, lousa, armário de aço, tabela de basquete, trave de futebol, bebedouro e
// mastro de bandeira; no hospital, leito com grades, suporte de soro, monitor no carrinho,
// biombo, cadeira de rodas, maca, armário de remédios, balcão da recepção e o heliponto; no
// posto de gasolina (RPG-45), bomba, pilar e cobertura, calibrador, totem de preços e freezer de gelo.
// Cada peça olha para +z (a frente do móvel); o gerador encosta na parede e vira a frente para
// dentro do cômodo. Escala do boneco de 1,5 de altura; a origem fica no centro do footprint.
// uso: node scripts/assets/institution-pieces.mjs <public/assets/institution>
import { mkdirSync } from 'node:fs';
import { glow, layers, shade, writePiece } from './piece-mesh.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) {
  throw new Error('uso: node scripts/assets/institution-pieces.mjs <public/assets/institution>');
}
mkdirSync(OUT, { recursive: true });

const WOOD = [168, 124, 78];
const WOOD_DARK = shade(WOOD, 0.6);
const STEEL = [150, 156, 164];
const STEEL_DARK = [64, 68, 76];
const BLACK = [28, 28, 32];
const WHITE = [226, 228, 230];
const CHALK_GREEN = [44, 86, 62];
const CHALK = [230, 232, 220];
const LOCKER_BLUE = [62, 104, 156];
const ORANGE = [214, 112, 40];
const NET = [236, 236, 236];
const FLAG = [44, 92, 168];
const FLAG_STAR = [240, 210, 70];
const LINEN = [230, 234, 236];
const MINT = [118, 186, 172];
const TEAL = [52, 132, 130];
const RED_CROSS = [200, 40, 40];
const BAG = [196, 220, 236];
const SCREEN = [80, 230, 150];
const PAD = [64, 68, 72];
const PAD_LINE = [236, 236, 228];
const FUEL_RED = [196, 40, 36];
const CONCRETE = [150, 150, 146];
const SAFETY_YELLOW = [236, 192, 40];
const AIR_BLUE = [48, 96, 170];

/** Caixa centrada em x e z, apoiada em y0. */
const block = (w, d, y0, y1, cx = 0, cz = 0) => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  y0,
  y1,
  z0: cz - d / 2,
  z1: cz + d / 2,
});

/** Quatro pés finos nos cantos do retângulo (centrado em cx, cz). */
function legs(mesh, { w, d, height, thick = 0.04, cx = 0, cz = 0 }) {
  const x = w / 2 - thick / 2;
  const z = d / 2 - thick / 2;
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    mesh.box(block(thick, thick, 0, height, cx + sx * x, cz + sz * z), ['ny']);
  }
}

/** Rodinha: um cubo escuro baixo (de longe, só o ponto preto embaixo do móvel). */
function wheels(mesh, w, d, cz = 0) {
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    mesh.box(block(0.06, 0.06, 0, 0.07, (sx * w) / 2, cz + (sz * d) / 2), ['ny']);
  }
}

// ---------------------------------------------------------------------------
// Escola
// ---------------------------------------------------------------------------

/** Carteira com a cadeira atrás (-z): o aluno sentado olha para +z, para a lousa. */
async function studentDesk() {
  const p = layers({ wood: WOOD, metal: STEEL_DARK, seat: [70, 110, 160] });
  legs(p.metal.mesh, { w: 0.56, d: 0.36, height: 0.44, cz: 0.12 });
  p.wood.mesh.box(block(0.6, 0.4, 0.44, 0.48, 0, 0.12));
  legs(p.metal.mesh, { w: 0.34, d: 0.3, height: 0.26, cz: -0.26 });
  p.seat.mesh.box(block(0.38, 0.34, 0.26, 0.3, 0, -0.26));
  p.seat.mesh.box(block(0.38, 0.04, 0.3, 0.6, 0, -0.42));
  await writePiece(OUT, 'esc-carteira', p);
}

/** Mesa do professor, 2×1: tampo largo, gaveteiro de um lado e a cadeira atrás (-z). */
async function teacherDesk() {
  const p = layers({ wood: WOOD_DARK, top: WOOD, metal: STEEL_DARK, seat: BLACK, paper: WHITE });
  p.wood.mesh.box(block(0.4, 0.56, 0, 0.5, -0.56, 0.06), ['ny']);
  p.wood.mesh.box(block(0.05, 0.56, 0, 0.5, 0.72, 0.06), ['ny']);
  p.wood.mesh.box(block(1.4, 0.03, 0.12, 0.5, 0.06, 0.32), ['ny']);
  p.top.mesh.box(block(1.56, 0.66, 0.5, 0.54, 0.08, 0.06));
  p.paper.mesh.box(block(0.24, 0.32, 0.54, 0.56, 0.3, 0.12), ['ny']);
  p.paper.mesh.box(block(0.2, 0.26, 0.54, 0.62, -0.3, 0.08), ['ny']);
  legs(p.metal.mesh, { w: 0.34, d: 0.32, height: 0.3, cx: 0.1, cz: -0.4 });
  p.seat.mesh.box(block(0.4, 0.36, 0.3, 0.36, 0.1, -0.4));
  p.seat.mesh.box(block(0.4, 0.05, 0.36, 0.78, 0.1, -0.58));
  await writePiece(OUT, 'esc-mesa-professor', p);
}

/** Lousa verde de 2×1, colada no fundo da casa (-z) para encostar na parede. */
async function chalkboard() {
  const p = layers({ frame: WOOD_DARK, board: CHALK_GREEN, chalk: CHALK });
  p.frame.mesh.box({ x0: -0.94, x1: 0.94, y0: 0.5, y1: 1.5, z0: -0.47, z1: -0.43 });
  p.board.mesh.box({ x0: -0.88, x1: 0.88, y0: 0.56, y1: 1.44, z0: -0.43, z1: -0.42 }, ['nz']);
  p.frame.mesh.box({ x0: -0.94, x1: 0.94, y0: 0.5, y1: 0.54, z0: -0.43, z1: -0.36 });
  // Riscos de giz: umas linhas tortas de aula pela metade.
  for (const [x, y, w] of [
    [-0.5, 1.28, 0.6],
    [-0.42, 1.16, 0.44],
    [-0.56, 1.04, 0.5],
    [0.36, 1.22, 0.34],
    [0.4, 0.9, 0.5],
  ]) {
    p.chalk.mesh.box(
      { x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + 0.025, z0: -0.42, z1: -0.415 },
      ['nz'],
    );
  }
  p.chalk.mesh.box(block(0.08, 0.03, 0.54, 0.57, 0.6, -0.4), ['ny']);
  await writePiece(OUT, 'esc-lousa', p);
}

/** Armário de aço da escola: duas portas estreitas com a grade de ventilação. */
async function lockers() {
  const p = layers({ steel: LOCKER_BLUE, seam: shade(LOCKER_BLUE, 0.55), metal: STEEL });
  p.steel.mesh.box(block(0.88, 0.46, 0, 1.6, 0, -0.2), ['ny']);
  p.seam.mesh.box(block(0.02, 0.01, 0.04, 1.56, 0, 0.035), ['ny', 'nz']);
  for (const x of [-0.22, 0.22]) {
    for (const y of [1.36, 1.42, 1.48])
      p.seam.mesh.box(block(0.24, 0.01, y, y + 0.02, x, 0.035), ['nz']);
    p.metal.mesh.box(block(0.04, 0.03, 0.8, 0.94, x + (x < 0 ? 0.16 : -0.16), 0.045), ['nz']);
  }
  await writePiece(OUT, 'esc-armario', p);
}

/** Tabela de basquete: poste no fundo (-z), a tabela e o aro virados para +z. */
async function basketHoop() {
  const p = layers({ pole: STEEL_DARK, board: WHITE, line: [196, 52, 40], rim: ORANGE, net: NET });
  p.pole.mesh.box(block(0.36, 0.36, 0, 0.08, 0, -0.32), ['ny']);
  p.pole.mesh.box(block(0.1, 0.1, 0, 2.3, 0, -0.32), ['ny']);
  p.pole.mesh.box(block(0.08, 0.36, 2.2, 2.28, 0, -0.14));
  p.board.mesh.box({ x0: -0.48, x1: 0.48, y0: 1.96, y1: 2.6, z0: 0.04, z1: 0.08 });
  p.line.mesh.box({ x0: -0.16, x1: 0.16, y0: 2.08, y1: 2.12, z0: 0.08, z1: 0.085 }, ['nz']);
  p.line.mesh.box({ x0: -0.16, x1: -0.12, y0: 2.08, y1: 2.32, z0: 0.08, z1: 0.085 }, ['nz']);
  p.line.mesh.box({ x0: 0.12, x1: 0.16, y0: 2.08, y1: 2.32, z0: 0.08, z1: 0.085 }, ['nz']);
  p.line.mesh.box({ x0: -0.16, x1: 0.16, y0: 2.28, y1: 2.32, z0: 0.08, z1: 0.085 }, ['nz']);
  const ring = { y0: 2.06, y1: 2.09 };
  p.rim.mesh.box({ x0: -0.16, x1: 0.16, ...ring, z0: 0.1, z1: 0.13 });
  p.rim.mesh.box({ x0: -0.16, x1: 0.16, ...ring, z0: 0.39, z1: 0.42 });
  p.rim.mesh.box({ x0: -0.16, x1: -0.13, ...ring, z0: 0.13, z1: 0.39 });
  p.rim.mesh.box({ x0: 0.13, x1: 0.16, ...ring, z0: 0.13, z1: 0.39 });
  p.net.mesh.box({ x0: -0.12, x1: 0.12, y0: 1.86, y1: 2.06, z0: 0.14, z1: 0.38 }, ['py']);
  await writePiece(OUT, 'esc-cesta-basquete', p);
}

/** Trave de futebol, 3×1: postes, travessão e a rede caindo para o fundo (-z). */
async function soccerGoal() {
  const p = layers({ post: WHITE, net: shade(NET, 0.9) });
  const half = 1.3;
  const top = 1.2;
  p.post.mesh.box(block(0.08, 0.08, 0, top, -half, 0.3), ['ny']);
  p.post.mesh.box(block(0.08, 0.08, 0, top, half, 0.3), ['ny']);
  p.post.mesh.box({
    x0: -half - 0.04,
    x1: half + 0.04,
    y0: top,
    y1: top + 0.08,
    z0: 0.26,
    z1: 0.34,
  });
  p.post.mesh.box({ x0: -half - 0.03, x1: half + 0.03, y0: 0, y1: 0.03, z0: -0.4, z1: -0.36 }, [
    'ny',
  ]);
  // A rede: o fundo inclinado e as laterais, em placas finas claras.
  p.net.mesh.quad([-half, 0, -0.38], [half, 0, -0.38], [half, top, 0.28], [-half, top, 0.28]);
  p.net.mesh.quad([half, 0, -0.38], [-half, 0, -0.38], [-half, top, 0.28], [half, top, 0.28]);
  for (const x of [-half, half]) {
    p.net.mesh.tri([x, 0, -0.38], [x, 0, 0.3], [x, top, 0.3]);
    p.net.mesh.tri([x, 0, 0.3], [x, 0, -0.38], [x, top, 0.3]);
  }
  await writePiece(OUT, 'esc-trave', p);
}

/** Bebedouro de inox encostado na parede (-z), com a torneirinha virada para +z. */
async function waterFountain() {
  const p = layers({ steel: STEEL, dark: STEEL_DARK, water: glow([150, 200, 240], 0.8) });
  p.steel.mesh.box(block(0.5, 0.36, 0, 0.84, 0, -0.26), ['ny']);
  p.dark.mesh.box(block(0.4, 0.26, 0.84, 0.86, 0, -0.24), ['ny']);
  p.steel.mesh.box(block(0.05, 0.08, 0.86, 0.94, -0.08, -0.12));
  p.steel.mesh.box(block(0.05, 0.08, 0.86, 0.94, 0.08, -0.12));
  p.water.mesh.box(block(0.03, 0.03, 0.86, 0.9, 0, -0.18), ['ny']);
  await writePiece(OUT, 'esc-bebedouro', p);
}

/** Mastro com uma bandeira azul de estrela: bandeira genérica, de nenhum país. */
async function flagpole() {
  const p = layers({ base: [150, 146, 136], pole: STEEL, flag: FLAG, star: FLAG_STAR });
  p.base.mesh.box(block(0.5, 0.5, 0, 0.16), ['ny']);
  p.pole.mesh.box(block(0.06, 0.06, 0.16, 3.2), ['ny']);
  p.pole.mesh.box(block(0.1, 0.1, 3.2, 3.26));
  p.flag.mesh.box({ x0: 0.03, x1: 0.93, y0: 2.6, y1: 3.14, z0: -0.01, z1: 0.01 });
  p.star.mesh.box({ x0: 0.38, x1: 0.56, y0: 2.78, y1: 2.96, z0: -0.015, z1: 0.015 });
  await writePiece(OUT, 'esc-mastro', p);
}

// ---------------------------------------------------------------------------
// Hospital
// ---------------------------------------------------------------------------

/** Leito de hospital, 1×2: cabeceira atrás (-z), grades dos lados e o colchão alto. */
async function hospitalBed() {
  const p = layers({ frame: WHITE, metal: STEEL, linen: LINEN, blanket: MINT, dark: STEEL_DARK });
  wheels(p.dark.mesh, 0.7, 1.7);
  legs(p.metal.mesh, { w: 0.74, d: 1.72, height: 0.42 });
  p.frame.mesh.box(block(0.82, 1.82, 0.42, 0.5));
  p.frame.mesh.box(block(0.86, 0.06, 0.42, 1.0, 0, -0.9));
  p.frame.mesh.box(block(0.86, 0.06, 0.42, 0.78, 0, 0.9));
  p.linen.mesh.box(block(0.76, 1.72, 0.5, 0.62), ['ny']);
  p.linen.mesh.box(block(0.56, 0.26, 0.62, 0.72, 0, -0.66), ['ny']);
  p.blanket.mesh.box(block(0.8, 1.06, 0.56, 0.66, 0, 0.32), ['ny']);
  for (const x of [-0.44, 0.44]) {
    p.metal.mesh.box(block(0.03, 0.8, 0.74, 0.77, x, -0.3));
    p.metal.mesh.box(block(0.03, 0.03, 0.5, 0.77, x, -0.68), ['ny']);
    p.metal.mesh.box(block(0.03, 0.03, 0.5, 0.77, x, 0.08), ['ny']);
  }
  await writePiece(OUT, 'hos-leito', p);
}

/** Suporte de soro: pé de cinco pontas, haste alta e a bolsa pendurada. */
async function ivStand() {
  const p = layers({ metal: STEEL, dark: STEEL_DARK, bag: glow(BAG, 0.9), tube: WHITE });
  p.dark.mesh.box(block(0.4, 0.06, 0, 0.05), ['ny']);
  p.dark.mesh.box(block(0.06, 0.4, 0, 0.05), ['ny']);
  p.metal.mesh.box(block(0.04, 0.04, 0.05, 1.7), ['ny']);
  p.metal.mesh.box(block(0.34, 0.03, 1.66, 1.69));
  p.bag.mesh.box(block(0.14, 0.05, 1.3, 1.6, 0.14, 0));
  p.tube.mesh.box(block(0.015, 0.015, 0.7, 1.3, 0.14, 0), ['ny']);
  await writePiece(OUT, 'hos-soro', p);
}

/** Monitor de sinais no carrinho: a tela acesa com a linha do coração virada para +z. */
async function monitorCart() {
  const p = layers({
    cart: WHITE,
    metal: STEEL,
    dark: BLACK,
    screen: glow(SCREEN),
    wheel: STEEL_DARK,
  });
  wheels(p.wheel.mesh, 0.4, 0.36);
  p.metal.mesh.box(block(0.05, 0.05, 0.07, 0.9), ['ny']);
  p.cart.mesh.box(block(0.46, 0.4, 0.07, 0.12));
  p.cart.mesh.box(block(0.44, 0.36, 0.86, 0.92));
  p.dark.mesh.box(block(0.44, 0.1, 0.92, 1.28, 0, -0.04));
  p.screen.mesh.box({ x0: -0.18, x1: 0.18, y0: 0.96, y1: 1.24, z0: 0.01, z1: 0.015 }, ['nz']);
  await writePiece(OUT, 'hos-monitor', p);
}

/** Biombo de três folhas de pano claro, em pé ao longo de x. */
async function screenDivider() {
  const p = layers({ frame: STEEL, cloth: [190, 216, 214], wheel: STEEL_DARK });
  for (const x of [-0.44, -0.15, 0.15, 0.44]) {
    p.frame.mesh.box(block(0.03, 0.03, 0.06, 1.4, x, 0), ['ny']);
    p.wheel.mesh.box(block(0.05, 0.12, 0, 0.06, x, 0), ['ny']);
  }
  for (const [x0, x1] of [
    [-0.43, -0.16],
    [-0.14, 0.14],
    [0.16, 0.43],
  ]) {
    p.cloth.mesh.box({ x0, x1, y0: 0.2, y1: 1.34, z0: -0.008, z1: 0.008 });
  }
  await writePiece(OUT, 'hos-biombo', p);
}

/** Cadeira de rodas: as rodas grandes dos lados, o assento e o encosto atrás (-z). */
async function wheelchair() {
  const p = layers({ frame: STEEL, seat: [44, 60, 90], wheel: BLACK });
  for (const x of [-0.27, 0.27]) {
    p.wheel.mesh.box(block(0.04, 0.56, 0, 0.56, x, -0.04), ['ny']);
    p.frame.mesh.box(block(0.04, 0.04, 0, 0.12, x * 0.8, 0.3), ['ny']);
  }
  p.frame.mesh.box(block(0.46, 0.06, 0.3, 0.34, 0, 0.26));
  p.seat.mesh.box(block(0.44, 0.42, 0.34, 0.4, 0, 0));
  p.seat.mesh.box(block(0.44, 0.05, 0.4, 0.82, 0, -0.2));
  p.frame.mesh.box(block(0.04, 0.12, 0.8, 0.84, -0.2, -0.28));
  p.frame.mesh.box(block(0.04, 0.12, 0.8, 0.84, 0.2, -0.28));
  await writePiece(OUT, 'hos-cadeira-rodas', p);
}

/** Maca de rodas, 1×2: mais baixa e estreita que o leito, com o lençol e o travesseiro. */
async function stretcher() {
  const p = layers({ frame: STEEL, linen: LINEN, pad: [60, 80, 120], wheel: BLACK });
  wheels(p.wheel.mesh, 0.5, 1.5);
  legs(p.frame.mesh, { w: 0.5, d: 1.5, height: 0.64, thick: 0.035 });
  p.frame.mesh.box(block(0.58, 1.76, 0.64, 0.68));
  p.pad.mesh.box(block(0.54, 1.7, 0.68, 0.74), ['ny']);
  p.linen.mesh.box(block(0.56, 1.0, 0.72, 0.76, 0, 0.28), ['ny']);
  p.linen.mesh.box(block(0.4, 0.22, 0.74, 0.82, 0, -0.66), ['ny']);
  await writePiece(OUT, 'hos-maca', p);
}

/** Armário de remédios: branco, porta de vidro em cima, gavetas embaixo e a cruz vermelha. */
async function medicineCabinet() {
  const p = layers({
    body: WHITE,
    glass: [170, 210, 220],
    seam: STEEL,
    cross: RED_CROSS,
    box: [220, 196, 120],
  });
  p.body.mesh.box(block(0.84, 0.44, 0, 1.6, 0, -0.2), ['ny']);
  p.glass.mesh.box({ x0: -0.36, x1: 0.36, y0: 0.86, y1: 1.5, z0: 0.02, z1: 0.025 }, ['nz']);
  for (const y of [0.3, 0.58])
    p.seam.mesh.box({ x0: -0.38, x1: 0.38, y0: y, y1: y + 0.015, z0: 0.02, z1: 0.025 }, ['nz']);
  p.cross.mesh.box({ x0: -0.06, x1: 0.06, y0: 1.18, y1: 1.42, z0: 0.025, z1: 0.03 }, ['nz']);
  p.cross.mesh.box({ x0: -0.12, x1: 0.12, y0: 1.24, y1: 1.36, z0: 0.025, z1: 0.03 }, ['nz']);
  await writePiece(OUT, 'hos-armario', p);
}

/** Balcão da recepção, 2×1: frente alta virada para +z, tampo baixo de trabalho atrás. */
async function receptionDesk() {
  const p = layers({
    body: WHITE,
    band: TEAL,
    top: WOOD,
    dark: BLACK,
    screen: glow([170, 210, 255]),
  });
  p.body.mesh.box({ x0: -0.92, x1: 0.92, y0: 0, y1: 1.0, z0: 0.18, z1: 0.36 }, ['ny']);
  p.band.mesh.box({ x0: -0.92, x1: 0.92, y0: 0.5, y1: 0.66, z0: 0.36, z1: 0.37 }, ['nz']);
  p.top.mesh.box({ x0: -0.96, x1: 0.96, y0: 1.0, y1: 1.04, z0: 0.12, z1: 0.42 });
  p.body.mesh.box({ x0: -0.92, x1: 0.92, y0: 0, y1: 0.66, z0: -0.3, z1: 0.18 }, ['ny']);
  p.top.mesh.box({ x0: -0.92, x1: 0.92, y0: 0.66, y1: 0.7, z0: -0.36, z1: 0.18 });
  p.dark.mesh.box(block(0.36, 0.04, 0.7, 0.98, -0.4, 0.02));
  p.screen.mesh.box({ x0: -0.56, x1: -0.24, y0: 0.74, y1: 0.94, z0: -0.025, z1: -0.02 }, ['pz']);
  await writePiece(OUT, 'hos-balcao', p);
}

/** Heliponto 4×4: a placa escura, o círculo claro e o H no meio, rente ao chão. */
async function helipad() {
  const p = layers({ pad: PAD, line: PAD_LINE, light: glow([255, 210, 90]) });
  p.pad.mesh.box(block(3.9, 3.9, 0, 0.04), ['ny']);
  const ring = 1.6;
  const thick = 0.12;
  const sides = 24;
  for (let i = 0; i < sides; i += 1) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const at = (r, a) => [Math.cos(a) * r, 0.045, Math.sin(a) * r];
    p.line.mesh.quad(at(ring, a0), at(ring - thick, a0), at(ring - thick, a1), at(ring, a1));
  }
  p.line.mesh.box({ x0: -0.5, x1: -0.34, y0: 0.04, y1: 0.05, z0: -0.7, z1: 0.7 }, ['ny']);
  p.line.mesh.box({ x0: 0.34, x1: 0.5, y0: 0.04, y1: 0.05, z0: -0.7, z1: 0.7 }, ['ny']);
  p.line.mesh.box({ x0: -0.34, x1: 0.34, y0: 0.04, y1: 0.05, z0: -0.08, z1: 0.08 }, ['ny']);
  for (const [x, z] of [
    [-1.8, -1.8],
    [1.8, -1.8],
    [-1.8, 1.8],
    [1.8, 1.8],
  ]) {
    p.light.mesh.box(block(0.1, 0.1, 0.04, 0.1, x, z), ['ny']);
  }
  await writePiece(OUT, 'hos-heliponto', p);
}

// ---------------------------------------------------------------------------
// Posto de gasolina
// ---------------------------------------------------------------------------

/** Bomba de combustível na ilha de concreto: visor aceso dos dois lados e um bico em cada lateral. */
async function fuelPump() {
  const p = layers({
    island: CONCRETE,
    body: WHITE,
    band: FUEL_RED,
    dark: BLACK,
    screen: glow([120, 230, 170]),
  });
  p.island.mesh.box(block(0.92, 0.92, 0, 0.12), ['ny']);
  p.body.mesh.box(block(0.5, 0.36, 0.12, 1.3), ['ny']);
  p.band.mesh.box(block(0.54, 0.4, 1.3, 1.5));
  for (const side of [-1, 1]) {
    const z = side * 0.181;
    p.screen.mesh.box(block(0.3, 0.01, 0.98, 1.18, 0, z), [side > 0 ? 'nz' : 'pz']);
    p.dark.mesh.box(block(0.07, 0.12, 0.66, 0.92, side * 0.285, 0), ['ny']);
    p.dark.mesh.box(block(0.03, 0.03, 0.3, 0.66, side * 0.31, 0.04), ['ny']);
  }
  await writePiece(OUT, 'pos-bomba', p);
}

/** Pilar da cobertura: 3 de altura (seis degraus), listrado de vermelho, com a sapata amarela. */
async function canopyPillar() {
  const p = layers({ base: SAFETY_YELLOW, pillar: WHITE, band: FUEL_RED });
  p.base.mesh.box(block(0.5, 0.5, 0, 0.2), ['ny']);
  p.pillar.mesh.box(block(0.3, 0.3, 0.2, 3), ['ny']);
  for (const y of [0.6, 1.6]) p.band.mesh.box(block(0.32, 0.32, y, y + 0.24), ['ny']);
  await writePiece(OUT, 'pos-pilar', p);
}

/**
 * Cobertura das bombas, 12×8: a laje com a faixa vermelha em volta e as luminárias por baixo.
 * Fica seis degraus acima do pátio, apoiada nos pilares; o corte de andar a esconde.
 */
async function canopy() {
  const p = layers({
    slab: [196, 198, 200],
    fascia: FUEL_RED,
    stripe: WHITE,
    light: glow([255, 250, 230]),
  });
  p.slab.mesh.box(block(11.9, 7.9, 0.05, 0.4));
  p.fascia.mesh.box(block(12, 0.06, 0, 0.5, 0, 3.97), ['nz']);
  p.fascia.mesh.box(block(12, 0.06, 0, 0.5, 0, -3.97), ['pz']);
  p.fascia.mesh.box(block(0.06, 7.88, 0, 0.5, 5.97, 0), ['nx']);
  p.fascia.mesh.box(block(0.06, 7.88, 0, 0.5, -5.97, 0), ['px']);
  p.stripe.mesh.box(block(12.02, 7.98, 0.3, 0.36), ['py', 'ny']);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    for (const z of [-2.5, 0, 2.5]) p.light.mesh.box(block(1.2, 0.3, 0.02, 0.05, x, z), ['py']);
  }
  await writePiece(OUT, 'pos-cobertura', p);
}

/** Calibrador de pneus: o poste azul, o visor e a mangueira enrolada. */
async function airTower() {
  const p = layers({ post: AIR_BLUE, base: CONCRETE, dark: BLACK, screen: glow([255, 200, 80]) });
  p.base.mesh.box(block(0.5, 0.5, 0, 0.08), ['ny']);
  p.post.mesh.box(block(0.26, 0.22, 0.08, 1.2), ['ny']);
  p.post.mesh.box(block(0.36, 0.3, 1.2, 1.36));
  p.screen.mesh.box(block(0.18, 0.01, 1.0, 1.12, 0, 0.115), ['nz']);
  p.dark.mesh.box(block(0.2, 0.08, 0.5, 0.78, 0, 0.15), ['ny']);
  await writePiece(OUT, 'pos-calibrador', p);
}

/** Totem de preços na beira da estrada: o letreiro aceso no alto e três linhas de preço. */
async function priceSign() {
  const p = layers({
    pole: STEEL_DARK,
    panel: FUEL_RED,
    logo: glow(WHITE),
    price: glow([255, 214, 80]),
  });
  p.pole.mesh.box(block(0.22, 0.22, 0, 1.6), ['ny']);
  p.panel.mesh.box(block(0.92, 0.2, 1.6, 3.8));
  for (const side of [-1, 1]) {
    const z = side * 0.105;
    const face = side > 0 ? 'nz' : 'pz';
    p.logo.mesh.box(block(0.7, 0.01, 3.3, 3.62, 0, z), [face]);
    for (const y of [1.8, 2.24, 2.68])
      p.price.mesh.box(block(0.6, 0.01, y, y + 0.28, 0, z), [face]);
  }
  await writePiece(OUT, 'pos-placa-precos', p);
}

/** Freezer de gelo da loja de conveniência: a caixa branca com o letreiro azul aceso na frente. */
async function iceFreezer() {
  const p = layers({ box: WHITE, lid: STEEL, label: glow([110, 180, 250]) });
  p.box.mesh.box(block(0.84, 0.54, 0, 1.0), ['ny']);
  p.lid.mesh.box(block(0.88, 0.58, 1.0, 1.06));
  p.label.mesh.box(block(0.6, 0.01, 0.6, 0.88, 0, 0.275), ['nz']);
  await writePiece(OUT, 'pos-freezer-gelo', p);
}

for (const make of [
  studentDesk,
  teacherDesk,
  chalkboard,
  lockers,
  basketHoop,
  soccerGoal,
  waterFountain,
  flagpole,
  hospitalBed,
  ivStand,
  monitorCart,
  screenDivider,
  wheelchair,
  stretcher,
  medicineCabinet,
  receptionDesk,
  helipad,
  fuelPump,
  canopyPillar,
  canopy,
  airTower,
  priceSign,
  iceFreezer,
]) {
  await make();
}
