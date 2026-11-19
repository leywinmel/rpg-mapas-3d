// Gera as peças dos mapas prontos de masmorra (RPG-63): sarcófago de pedra com tampa entalhada,
// altar de pedra com velas e um monte de ossos com crânio. Escala do boneco de 1,5 de altura.
// Cada peça olha para +z e tem a base em y = 0.
// uso: node scripts/assets/dungeon-pieces.mjs <public/assets/dungeon>
import { mkdirSync } from 'node:fs';
import { glow, layers, shade, writePiece } from './piece-mesh.mjs';
import { blob, random, segment } from './organic-mesh.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) throw new Error('uso: node scripts/assets/dungeon-pieces.mjs <public/assets/dungeon>');
mkdirSync(OUT, { recursive: true });

const STONE = [118, 112, 104];
const STONE_DARK = shade(STONE, 0.66);
const BONE = [214, 202, 176];
const WAX = [226, 214, 182];
const FLAME = [255, 176, 72];
const CLOTH = [104, 28, 30];
const GOLD = [178, 142, 62];

/** Caixa centrada em x e z, apoiada em y0. */
const block = (w, d, y0, y1, cx = 0, cz = 0) => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  y0,
  y1,
  z0: cz - d / 2,
  z1: cz + d / 2,
});

/** Vela acesa: o pavio brilha sozinho, para a chama aparecer no escuro da masmorra. */
function candle(p, [x, y, z], height) {
  segment(p.wax.mesh, { from: [x, y, z], to: [x, y + height, z], r0: 0.035, r1: 0.03, sides: 6 });
  p.flame.mesh.box(block(0.03, 0.03, y + height, y + height + 0.07, x, z));
}

/** Sarcófago 1×2: caixa de pedra com rodapé e a tampa com a figura deitada em relevo. */
async function sarcophagus() {
  const p = layers({ stone: STONE, dark: STONE_DARK });
  p.dark.mesh.box(block(0.86, 1.8, 0, 0.12), ['ny']);
  p.stone.mesh.box(block(0.78, 1.72, 0.12, 0.66), ['ny']);
  p.dark.mesh.box(block(0.84, 1.78, 0.66, 0.74), ['ny']);
  // Figura na tampa: corpo, mãos cruzadas e a cabeça na ponta de trás (-z).
  p.stone.mesh.box(block(0.36, 1.1, 0.74, 0.86, 0, 0.12), ['ny']);
  p.stone.mesh.box(block(0.24, 0.18, 0.86, 0.92, 0, -0.05), ['ny']);
  p.stone.mesh.box(block(0.2, 0.22, 0.74, 0.94, 0, -0.62), ['ny']);
  await writePiece(OUT, 'mas-sarcofago', p);
}

/** Altar 2×1: bloco de pedra com degrau, toalha vermelha, cálice e velas nas pontas. */
async function altar() {
  const p = layers({
    stone: STONE,
    dark: STONE_DARK,
    cloth: CLOTH,
    gold: GOLD,
    wax: WAX,
    flame: glow(FLAME),
  });
  p.dark.mesh.box(block(1.8, 0.86, 0, 0.14), ['ny']);
  p.stone.mesh.box(block(1.6, 0.66, 0.14, 0.92), ['ny']);
  p.dark.mesh.box(block(1.72, 0.76, 0.92, 1.0), ['ny']);
  // Toalha por cima, caindo na frente (+z).
  p.cloth.mesh.box(block(0.9, 0.78, 1.0, 1.02), ['ny']);
  p.cloth.mesh.box({ x0: -0.45, x1: 0.45, y0: 0.6, y1: 1.02, z0: 0.38, z1: 0.4 });
  segment(p.gold.mesh, { from: [0, 1.02, -0.1], to: [0, 1.14, -0.1], r0: 0.05, r1: 0.03 });
  segment(p.gold.mesh, { from: [0, 1.14, -0.1], to: [0, 1.24, -0.1], r0: 0.03, r1: 0.08 });
  for (const x of [-0.7, -0.55, 0.55, 0.7]) candle(p, [x, 1.0, -0.15], x * x > 0.4 ? 0.26 : 0.18);
  await writePiece(OUT, 'mas-altar', p);
}

/** Monte de ossos: costelas e ossos longos espalhados e um crânio por cima. */
async function bones() {
  const p = layers({ bone: BONE, dark: shade(BONE, 0.5) });
  const rand = random(17);
  for (let index = 0; index < 9; index += 1) {
    const angle = rand() * Math.PI * 2;
    const length = 0.25 + rand() * 0.2;
    const cx = (rand() - 0.5) * 0.5;
    const cz = (rand() - 0.5) * 0.5;
    const dx = (Math.cos(angle) * length) / 2;
    const dz = (Math.sin(angle) * length) / 2;
    const y = 0.03 + index * 0.012;
    segment(p.bone.mesh, {
      from: [cx - dx, y, cz - dz],
      to: [cx + dx, y + 0.02, cz + dz],
      r0: 0.025,
      r1: 0.025,
      sides: 5,
    });
  }
  blob(p.bone.mesh, { center: [0.05, 0.16, 0.02], radius: [0.11, 0.1, 0.12], jitter: 0.08, rand });
  // Órbitas e nariz escuros, de frente (+z).
  for (const x of [0.01, 0.09]) p.dark.mesh.box(block(0.04, 0.02, 0.15, 0.19, x, 0.13));
  p.dark.mesh.box(block(0.02, 0.02, 0.11, 0.13, 0.05, 0.135));
  await writePiece(OUT, 'mas-ossos', p);
}

for (const make of [sarcophagus, altar, bones]) await make();
