// Gera os móveis e adereços do estilo moderno (RPG-47): dentro de casa (sofá, cama, guarda-roupa,
// estante, geladeira, fogão, rack com TV, vaso de planta), na loja (balcão e prateleira), na
// rua (poste, hidrante, lixeira, banco de praça, placa de rua e banca de jornal, RPG-36) e no quintal (churrasqueira). Servem ao
// gerador de vila/cidade e às casas prontas, que antes quase só tinham mesa e cadeira.
// Cada peça ocupa 1 casa e olha para +z (a frente do móvel); o gerador encosta na parede e
// vira a frente para dentro do cômodo.
// uso: node scripts/assets/furniture-pieces.mjs <public/assets/modern>
import { glow, layers, shade, writePiece } from './piece-mesh.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) throw new Error('uso: node scripts/assets/furniture-pieces.mjs <public/assets/modern>');

/** Metade do lado útil da casa: sobra uma folga para o móvel não encostar no vizinho. */
const H = 0.42;

const WOOD = [128, 86, 52];
const WOOD_DARK = shade(WOOD, 0.6);
const WOOD_LIGHT = [178, 136, 92];
const FABRIC = [72, 92, 128];
const LINEN = [222, 216, 200];
const WHITE = [214, 216, 218];
const STEEL = [120, 124, 132];
const STEEL_DARK = [52, 54, 60];
const BLACK = [26, 26, 30];
const BOOKS = [
  [150, 52, 46],
  [52, 96, 140],
  [200, 160, 60],
  [60, 120, 70],
  [110, 70, 130],
];
const LEAF = [64, 128, 62];
const POT = [168, 92, 60];
const RED = [190, 36, 32];
const BIN = [48, 96, 64];
const BRICK = [150, 72, 52];
const LAMP_LIGHT = [255, 222, 160];

/** Caixa centrada em x e z, apoiada em y0. */
const block = (w, d, y0, y1, cx = 0, cz = 0) => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  y0,
  y1,
  z0: cz - d / 2,
  z1: cz + d / 2,
});

/** Quatro pés finos nos cantos do retângulo. */
function legs(mesh, w, d, height, thick = 0.05) {
  const x = w / 2 - thick / 2;
  const z = d / 2 - thick / 2;
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    mesh.box(block(thick, thick, 0, height, sx * x, sz * z), ['ny']);
  }
}

async function sofa() {
  const p = layers({ fabric: FABRIC, cushion: shade(FABRIC, 1.25), wood: WOOD_DARK });
  legs(p.wood.mesh, 0.8, 0.6, 0.08);
  p.fabric.mesh.box(block(0.84, 0.62, 0.08, 0.32), ['ny']);
  p.fabric.mesh.box(block(0.84, 0.16, 0.32, 0.75, 0, -0.23));
  p.fabric.mesh.box(block(0.12, 0.46, 0.32, 0.52, -0.36, 0.08));
  p.fabric.mesh.box(block(0.12, 0.46, 0.32, 0.52, 0.36, 0.08));
  p.cushion.mesh.box(block(0.29, 0.44, 0.32, 0.42, -0.15, 0.07));
  p.cushion.mesh.box(block(0.29, 0.44, 0.32, 0.42, 0.15, 0.07));
  await writePiece(OUT, 'mod-sofa', p);
}

async function bed() {
  const p = layers({ wood: WOOD, linen: LINEN, blanket: [150, 60, 64] });
  p.wood.mesh.box(block(0.7, 0.84, 0, 0.26), ['ny']);
  p.wood.mesh.box(block(0.74, 0.06, 0, 0.62, 0, -0.41), ['ny']);
  p.linen.mesh.box(block(0.66, 0.8, 0.26, 0.36), ['ny']);
  p.linen.mesh.box(block(0.5, 0.16, 0.36, 0.44, 0, -0.28), ['ny']);
  p.blanket.mesh.box(block(0.68, 0.48, 0.3, 0.38, 0, 0.17), ['ny']);
  await writePiece(OUT, 'mod-cama', p);
}

async function wardrobe() {
  const p = layers({ wood: WOOD_LIGHT, seam: WOOD_DARK, metal: STEEL });
  p.wood.mesh.box(block(0.84, 0.5, 0, 1.7, 0, -0.17), ['ny']);
  p.seam.mesh.box(block(0.02, 0.01, 0.06, 1.64, 0, 0.085), ['ny', 'nz']);
  p.seam.mesh.box(block(0.8, 0.01, 0.06, 0.08, 0, 0.085), ['ny', 'nz']);
  p.metal.mesh.box(block(0.03, 0.03, 0.8, 1.0, -0.05, 0.1), ['nz']);
  p.metal.mesh.box(block(0.03, 0.03, 0.8, 1.0, 0.05, 0.1), ['nz']);
  await writePiece(OUT, 'mod-armario', p);
}

async function bookshelf() {
  const p = layers({
    wood: WOOD,
    ...Object.fromEntries(BOOKS.map((color, index) => [`book${index}`, color])),
  });
  const back = { z0: -0.22, z1: 0.06 };
  p.wood.mesh.box({ x0: -H, x1: H, y0: 0, y1: 1.6, z0: back.z0, z1: back.z0 + 0.03 }, ['ny']);
  p.wood.mesh.box({ x0: -H, x1: -H + 0.04, y0: 0, y1: 1.6, ...back }, ['ny']);
  p.wood.mesh.box({ x0: H - 0.04, x1: H, y0: 0, y1: 1.6, ...back }, ['ny']);
  const shelves = [0, 0.4, 0.8, 1.2, 1.56];
  for (const y of shelves) p.wood.mesh.box({ x0: -H, x1: H, y0: y, y1: y + 0.04, ...back });
  // Livros em fileira, de alturas e cores variadas (sequência fixa: a peça sai sempre igual).
  for (const [row, y] of shelves.slice(0, -1).entries()) {
    let x = -H + 0.06;
    let index = row;
    while (x < H - 0.12) {
      const width = 0.05 + (index % 3) * 0.015;
      const height = 0.24 + ((index * 7) % 5) * 0.02;
      p[`book${index % BOOKS.length}`].mesh.box(
        { x0: x, x1: x + width, y0: y + 0.04, y1: y + 0.04 + height, z0: -0.18, z1: 0.02 },
        ['ny'],
      );
      x += width + 0.01;
      index += 1;
    }
  }
  await writePiece(OUT, 'mod-estante', p);
}

async function fridge() {
  const p = layers({ body: WHITE, seam: shade(WHITE, 0.7), metal: STEEL });
  p.body.mesh.box(block(0.66, 0.62, 0, 1.6, 0, -0.08), ['ny']);
  p.seam.mesh.box(block(0.64, 0.01, 1.08, 1.1, 0, 0.23), ['ny', 'nz']);
  p.metal.mesh.box(block(0.03, 0.03, 0.7, 1.0, 0.26, 0.24), ['nz']);
  p.metal.mesh.box(block(0.03, 0.03, 1.18, 1.4, 0.26, 0.24), ['nz']);
  await writePiece(OUT, 'mod-geladeira', p);
}

async function stove() {
  const p = layers({ body: WHITE, top: STEEL_DARK, burner: BLACK, glass: [40, 44, 52] });
  p.body.mesh.box(block(0.7, 0.62, 0, 0.84, 0, -0.08), ['ny']);
  p.top.mesh.box(block(0.7, 0.62, 0.84, 0.86, 0, -0.08), ['ny']);
  for (const [x, z] of [
    [-0.17, -0.22],
    [0.17, -0.22],
    [-0.17, 0.06],
    [0.17, 0.06],
  ]) {
    p.burner.mesh.box(block(0.16, 0.16, 0.86, 0.89, x, z), ['ny']);
  }
  p.glass.mesh.box(block(0.5, 0.01, 0.2, 0.6, 0, 0.23), ['ny', 'nz']);
  p.top.mesh.box(block(0.4, 0.03, 0.66, 0.69, 0, 0.245), ['nz']);
  p.body.mesh.box(block(0.7, 0.06, 0.86, 1.06, 0, -0.36), ['ny']);
  await writePiece(OUT, 'mod-fogao', p);
}

async function tvRack() {
  const p = layers({ wood: WOOD_DARK, frame: BLACK, screen: glow([30, 52, 84]) });
  p.wood.mesh.box(block(0.84, 0.4, 0, 0.42, 0, -0.2), ['ny']);
  p.frame.mesh.box(block(0.08, 0.08, 0.42, 0.5, 0, -0.24), ['ny']);
  p.frame.mesh.box(block(0.72, 0.05, 0.5, 0.94, 0, -0.24), ['ny']);
  p.screen.mesh.box(block(0.66, 0.01, 0.53, 0.91, 0, -0.21), ['ny', 'nz']);
  await writePiece(OUT, 'mod-tv', p);
}

async function plant() {
  const p = layers({ pot: POT, soil: [70, 48, 34], leaf: LEAF, leafDark: shade(LEAF, 0.7) });
  p.pot.mesh.box(block(0.34, 0.34, 0, 0.36), ['ny']);
  p.soil.mesh.box(block(0.3, 0.3, 0.36, 0.37), ['ny']);
  p.leaf.mesh.box(block(0.3, 0.3, 0.5, 0.9), ['ny']);
  p.leafDark.mesh.box(block(0.44, 0.2, 0.62, 0.8), ['ny']);
  p.leafDark.mesh.box(block(0.2, 0.44, 0.66, 0.84), ['ny']);
  p.leaf.mesh.box(block(0.16, 0.16, 0.9, 1.08, 0.04, -0.02), ['ny']);
  p.pot.mesh.box(block(0.06, 0.06, 0.36, 0.52), ['ny']);
  await writePiece(OUT, 'mod-vaso-planta', p);
}

async function counter() {
  const p = layers({ body: WOOD_LIGHT, top: [70, 72, 78], panel: shade(WOOD_LIGHT, 0.8) });
  p.body.mesh.box(block(0.9, 0.5, 0, 0.95, 0, -0.1), ['ny']);
  p.top.mesh.box(block(0.94, 0.6, 0.95, 1.0, 0, -0.08), ['ny']);
  p.panel.mesh.box(block(0.8, 0.01, 0.1, 0.85, 0, 0.155), ['ny', 'nz']);
  await writePiece(OUT, 'mod-balcao', p);
}

async function shelf() {
  const p = layers({
    metal: [170, 172, 178],
    ...Object.fromEntries(BOOKS.map((color, index) => [`goods${index}`, color])),
  });
  legs(p.metal.mesh, 0.86, 0.5, 1.5, 0.04);
  for (const y of [0.1, 0.5, 0.9, 1.3]) p.metal.mesh.box(block(0.86, 0.5, y, y + 0.03));
  // Produtos em caixas e potes, em fileira, cores alternadas.
  for (const [row, y] of [0.13, 0.53, 0.93].entries()) {
    for (let slot = 0; slot < 5; slot += 1) {
      const color = (row * 2 + slot) % BOOKS.length;
      const height = 0.16 + ((row + slot) % 3) * 0.06;
      p[`goods${color}`].mesh.box(block(0.14, 0.3, y, y + height, -0.32 + slot * 0.16, 0.02), [
        'ny',
      ]);
    }
  }
  await writePiece(OUT, 'mod-prateleira', p);
}

async function streetLamp() {
  const p = layers({ metal: STEEL_DARK, lamp: glow(LAMP_LIGHT) });
  p.metal.mesh.box(block(0.2, 0.2, 0, 0.12), ['ny']);
  p.metal.mesh.box(block(0.08, 0.08, 0.12, 2.6), ['ny']);
  p.metal.mesh.box(block(0.06, 0.5, 2.5, 2.56, 0, 0.22));
  p.metal.mesh.box(block(0.2, 0.24, 2.44, 2.54, 0, 0.42));
  p.lamp.mesh.box(block(0.16, 0.2, 2.42, 2.44, 0, 0.42));
  await writePiece(OUT, 'mod-poste', p);
}

async function hydrant() {
  const p = layers({ red: RED, cap: shade(RED, 0.7), metal: STEEL });
  p.red.mesh.box(block(0.2, 0.2, 0, 0.5), ['ny']);
  p.cap.mesh.box(block(0.26, 0.26, 0.04, 0.1), ['ny']);
  p.cap.mesh.box(block(0.24, 0.24, 0.5, 0.56), ['ny']);
  p.cap.mesh.box(block(0.1, 0.1, 0.56, 0.64), ['ny']);
  p.metal.mesh.box(block(0.36, 0.08, 0.3, 0.38), ['ny']);
  p.metal.mesh.box(block(0.08, 0.1, 0.28, 0.38, 0, 0.12), ['ny', 'nz']);
  await writePiece(OUT, 'mod-hidrante', p);
}

async function trashBin() {
  const p = layers({ bin: BIN, lid: shade(BIN, 0.7), metal: STEEL_DARK });
  p.bin.mesh.box(block(0.36, 0.36, 0.04, 0.7), ['ny']);
  p.lid.mesh.box(block(0.4, 0.4, 0.7, 0.76), ['ny']);
  p.metal.mesh.box(block(0.38, 0.38, 0, 0.04), ['ny']);
  p.metal.mesh.box(block(0.16, 0.04, 0.76, 0.8), ['ny']);
  await writePiece(OUT, 'mod-lixeira', p);
}

async function bench() {
  const p = layers({ wood: WOOD, metal: STEEL_DARK });
  for (const x of [-0.34, 0.34]) {
    p.metal.mesh.box(block(0.05, 0.36, 0, 0.4, x, 0), ['ny']);
    p.metal.mesh.box(block(0.05, 0.05, 0.4, 0.78, x, -0.17), ['ny']);
  }
  for (const z of [-0.1, 0.02, 0.14]) p.wood.mesh.box(block(0.86, 0.1, 0.4, 0.45, 0, z));
  for (const y of [0.55, 0.68]) p.wood.mesh.box(block(0.86, 0.04, y, y + 0.09, 0, -0.18));
  await writePiece(OUT, 'mod-banco-praca', p);
}

async function grill() {
  const p = layers({
    brick: BRICK,
    mortar: shade(BRICK, 0.65),
    metal: BLACK,
    ember: glow([200, 70, 20]),
  });
  p.brick.mesh.box(block(0.84, 0.5, 0, 0.8, 0, -0.1), ['ny']);
  p.mortar.mesh.box(block(0.6, 0.01, 0.3, 0.7, 0, 0.155), ['ny', 'nz']);
  p.ember.mesh.box(block(0.56, 0.01, 0.34, 0.4, 0, 0.16), ['ny', 'nz']);
  p.metal.mesh.box(block(0.6, 0.3, 0.8, 0.82, 0, -0.05));
  p.brick.mesh.box(block(0.3, 0.3, 0.8, 1.6, 0, -0.2), ['ny']);
  p.mortar.mesh.box(block(0.34, 0.34, 1.6, 1.66, 0, -0.2), ['ny']);
  await writePiece(OUT, 'mod-churrasqueira', p);
}

async function streetSign() {
  const p = layers({ metal: STEEL, sign: [40, 110, 70], letters: WHITE });
  p.metal.mesh.box(block(0.06, 0.06, 0, 2.3, 0, -0.2), ['ny']);
  // Duas placas cruzadas no alto, como numa esquina.
  p.sign.mesh.box(block(0.7, 0.03, 2.0, 2.2, 0.2, -0.2));
  p.sign.mesh.box(block(0.03, 0.7, 2.24, 2.44, 0, 0.0));
  p.letters.mesh.box(block(0.5, 0.01, 2.07, 2.13, 0.2, -0.18), ['ny', 'nz']);
  p.letters.mesh.box(block(0.01, 0.5, 2.31, 2.37, 0.02, 0.0), ['ny', 'nx']);
  await writePiece(OUT, 'mod-placa-rua', p);
}

async function newsstand() {
  const p = layers({ body: [46, 84, 120], roof: [190, 60, 48], paper: LINEN, metal: STEEL_DARK });
  p.body.mesh.box(block(0.84, 0.6, 0, 1.1, 0, -0.12), ['ny']);
  p.roof.mesh.box(block(0.92, 0.84, 1.1, 1.2, 0, 0.0));
  p.metal.mesh.box(block(0.8, 0.22, 0.5, 0.56, 0, 0.29), ['ny']);
  // Revistas e jornais à mostra na frente.
  for (const [index, x] of [-0.28, -0.08, 0.12, 0.3].entries()) {
    p.paper.mesh.box(block(0.16, 0.18, 0.56, 0.58 + (index % 2) * 0.02, x, 0.29), ['ny']);
    p.paper.mesh.box(block(0.16, 0.01, 0.62, 0.86, x, 0.19), ['nz']);
  }
  await writePiece(OUT, 'mod-banca', p);
}

for (const make of [
  sofa,
  bed,
  wardrobe,
  bookshelf,
  fridge,
  stove,
  tvRack,
  plant,
  counter,
  shelf,
  streetLamp,
  hydrant,
  trashBin,
  bench,
  grill,
  streetSign,
  newsstand,
]) {
  await make();
}
