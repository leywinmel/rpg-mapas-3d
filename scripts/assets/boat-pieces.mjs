// Gera os barcos do estilo medieval (RPG-46): bote a remo, barco pesqueiro e navio grande.
// Servem à biblioteca e ao gerador de porto. Cada barco olha para +z (a proa) e tem a base em
// y = 0, na linha d'água: o casco fica por cima da peça de água.
// uso: node scripts/assets/boat-pieces.mjs <public/assets/medieval>
import { layers, shade, writePiece } from './piece-mesh.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) throw new Error('uso: node scripts/assets/boat-pieces.mjs <public/assets/medieval>');

const HULL = [112, 74, 44];
const HULL_DARK = shade(HULL, 0.62);
const DECK = [168, 126, 82];
const ROPE = [196, 170, 120];
const SAIL = [226, 214, 186];
const RED = [150, 44, 36];
const NET = [92, 110, 96];
const IRON = [64, 64, 70];

/** Caixa centrada em x e z, apoiada em y0. */
const block = (w, d, y0, y1, cx = 0, cz = 0) => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  y0,
  y1,
  z0: cz - d / 2,
  z1: cz + d / 2,
});

/**
 * Casco com proa em ponta (+z) e fundo mais estreito que o convés, o "V" do barco.
 * Os pontos seguem a volta no sentido que deixa as faces viradas para fora (como em `box`).
 */
function hull(mesh, { half, length, height, bow }) {
  const front = length / 2;
  const deck = [
    [0, front],
    [half, front - bow],
    [half * 0.88, -front],
    [-half * 0.88, -front],
    [-half, front - bow],
  ];
  const keel = deck.map(([x, z]) => [x * 0.45, z * 0.9]);
  const top = deck.map(([x, z]) => [x, height, z]);
  const bottom = keel.map(([x, z]) => [x, 0, z]);
  for (let index = 0; index < deck.length; index += 1) {
    const next = (index + 1) % deck.length;
    mesh.quad(bottom[index], bottom[next], top[next], top[index]);
    mesh.tri([0, height, 0], top[index], top[next]);
    mesh.tri([0, 0, 0], bottom[next], bottom[index]);
  }
}

/** Mastro com uma vela quadrada atravessada no barco. */
function mast(p, { z, height, sailWidth, sailHeight, base }) {
  p.wood.mesh.box(block(0.12, 0.12, base, base + height, 0, z), ['ny']);
  p.wood.mesh.box(block(sailWidth + 0.2, 0.08, base + height - 0.3, base + height - 0.22, 0, z));
  p.sail.mesh.box(
    block(sailWidth, 0.04, base + height - 0.3 - sailHeight, base + height - 0.32, 0, z + 0.1),
  );
}

async function rowboat() {
  const p = layers({ hull: HULL, rim: HULL_DARK, wood: DECK, rope: ROPE });
  hull(p.hull.mesh, { half: 0.36, length: 1.8, height: 0.34, bow: 0.5 });
  p.rim.mesh.box(block(0.7, 0.05, 0.3, 0.38, 0, -0.88), ['ny']);
  for (const z of [-0.45, 0.05, 0.45]) {
    p.wood.mesh.box(block(0.62 - Math.max(0, z) * 0.5, 0.14, 0.26, 0.31, 0, z));
  }
  // Remos cruzados por cima dos bancos.
  p.wood.mesh.box({ x0: -0.05, x1: 0.05, y0: 0.32, y1: 0.36, z0: -0.7, z1: 0.6 });
  p.wood.mesh.box({ x0: 0.12, x1: 0.22, y0: 0.32, y1: 0.36, z0: -0.7, z1: 0.6 });
  p.rope.mesh.box(block(0.18, 0.18, 0.3, 0.36, 0, 0.7));
  await writePiece(OUT, 'med-bote', p);
}

async function fishingBoat() {
  const p = layers({
    hull: HULL,
    stripe: RED,
    deck: DECK,
    wood: HULL_DARK,
    sail: SAIL,
    net: NET,
    rope: ROPE,
  });
  hull(p.hull.mesh, { half: 0.82, length: 3.8, height: 0.62, bow: 1.1 });
  p.stripe.mesh.box(block(1.44, 0.02, 0.48, 0.58, 0, -1.72), ['ny']);
  p.deck.mesh.box(block(1.4, 2.6, 0.56, 0.62, 0, -0.45), ['ny']);
  // Cabine na popa, com teto inclinado de uma água só.
  p.wood.mesh.box(block(1.0, 0.9, 0.62, 1.42, 0, -1.25), ['ny']);
  p.deck.mesh.box(block(1.14, 1.06, 1.42, 1.5, 0, -1.25));
  mast(p, { z: 0.4, height: 2.3, sailWidth: 1.1, sailHeight: 1.2, base: 0.62 });
  p.net.mesh.box(block(0.7, 0.5, 0.62, 0.8, -0.2, -0.3), ['ny']);
  p.rope.mesh.box(block(0.24, 0.24, 0.62, 0.72, 0.35, 1.0), ['ny']);
  await writePiece(OUT, 'med-pesqueiro', p);
}

async function ship() {
  const p = layers({
    hull: HULL,
    stripe: RED,
    deck: DECK,
    wood: HULL_DARK,
    sail: SAIL,
    iron: IRON,
    rope: ROPE,
  });
  hull(p.hull.mesh, { half: 1.82, length: 9.6, height: 1.4, bow: 2.8 });
  p.stripe.mesh.box(block(3.24, 0.02, 1.1, 1.26, 0, -4.32), ['ny']);
  p.deck.mesh.box(block(3.2, 6.6, 1.3, 1.4, 0, -1.0), ['ny']);
  // Castelo de popa (cabine alta atrás) e o de proa, mais baixo.
  p.wood.mesh.box(block(3.0, 2.2, 1.4, 2.6, 0, -3.3), ['ny']);
  p.deck.mesh.box(block(3.1, 2.3, 2.6, 2.7, 0, -3.3));
  p.wood.mesh.box(block(2.2, 1.0, 1.4, 1.9, 0, 2.6), ['ny']);
  // Amurada: uma faixa baixa nas laterais do convés.
  p.wood.mesh.box({ x0: -1.62, x1: -1.5, y0: 1.4, y1: 1.7, z0: -2.2, z1: 2.4 }, ['ny']);
  p.wood.mesh.box({ x0: 1.5, x1: 1.62, y0: 1.4, y1: 1.7, z0: -2.2, z1: 2.4 }, ['ny']);
  mast(p, { z: 1.0, height: 6.4, sailWidth: 3.0, sailHeight: 3.4, base: 1.4 });
  mast(p, { z: -1.4, height: 5.4, sailWidth: 2.6, sailHeight: 2.8, base: 1.4 });
  // Gurupés (o pau da proa) e canhões nas laterais.
  p.wood.mesh.box({ x0: -0.06, x1: 0.06, y0: 1.5, y1: 1.62, z0: 4.4, z1: 5.6 });
  for (const z of [-1.6, -0.4, 0.8]) {
    p.iron.mesh.box({ x0: -1.9, x1: -1.6, y0: 1.0, y1: 1.16, z0: z - 0.08, z1: z + 0.08 });
    p.iron.mesh.box({ x0: 1.6, x1: 1.9, y0: 1.0, y1: 1.16, z0: z - 0.08, z1: z + 0.08 });
  }
  p.rope.mesh.box(block(0.4, 0.4, 1.4, 1.56, 1.0, 0.0), ['ny']);
  await writePiece(OUT, 'med-navio', p);
}

for (const make of [rowboat, fishingBoat, ship]) await make();
