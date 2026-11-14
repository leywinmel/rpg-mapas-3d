// Gera a vegetação genérica (RPG-37): árvores de vários tipos (pinheiro, carvalho, bétula,
// árvore seca, palmeira, cacto), arbustos, flores, capim, folhas no chão, seixos, pedregulho,
// cogumelos, tronco caído e toco. Servem a todos os estilos (vila, cidade, masmorra, deserto,
// porto) e aos geradores, que antes só tinham uma árvore e uma rocha.
// Malha de faces chapadas como o resto do site; a variação (galhos, copas tortas) sai de uma
// semente fixa por peça, então rodar de novo gera os mesmos arquivos.
// uso: node scripts/assets/vegetation-pieces.mjs <public/assets/nature>
import { mkdirSync } from 'node:fs';
import { layers, shade, writePiece } from './piece-mesh.mjs';
import { add, blob, lean, random, scale, segment, sheet, sub } from './organic-mesh.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) throw new Error('uso: node scripts/assets/vegetation-pieces.mjs <public/assets/nature>');
mkdirSync(OUT, { recursive: true });

// Tons do visual sombrio, mas sem afundar no preto: de longe a folhagem ainda lê como verde.
const BARK = [98, 70, 48];
const BARK_DARK = shade(BARK, 0.75);
const BIRCH = [214, 208, 194];
const PINE = [50, 98, 66];
const OAK = [76, 122, 58];
const BUSH = [66, 112, 60];
const PALM = [92, 134, 62];
const CACTUS = [74, 120, 74];
const GRASS = [104, 140, 64];
const DEAD = [92, 82, 72];
const STONE = [128, 126, 120];
const STONE_DARK = shade(STONE, 0.78);
const MOSS = [84, 110, 62];
const PETALS = [
  [206, 64, 70],
  [232, 196, 72],
  [168, 96, 188],
  [236, 232, 220],
];
const AUTUMN = [
  [176, 92, 40],
  [196, 144, 52],
  [140, 56, 40],
];
const CAP = [168, 60, 48];
const CAP_LIGHT = [226, 214, 196];

async function pine() {
  const p = layers({ bark: BARK, needles: PINE, tip: shade(PINE, 1.18) });
  segment(p.bark.mesh, { from: [0, 0, 0], to: [0, 0.7, 0], r0: 0.1, r1: 0.07, sides: 6 });
  const tiers = [
    { y0: 0.45, y1: 1.35, r: 0.48 },
    { y0: 0.95, y1: 1.8, r: 0.38 },
    { y0: 1.45, y1: 2.35, r: 0.27 },
  ];
  tiers.forEach(({ y0, y1, r }, index) => {
    const layer = index === tiers.length - 1 ? p.tip : p.needles;
    segment(layer.mesh, { from: [0, y0, 0], to: [0, y1, 0], r0: r, r1: 0, sides: 7, twist: index });
  });
  await writePiece(OUT, 'nat-pinheiro', p);
}

async function oak() {
  const rand = random(11);
  const p = layers({ bark: BARK, leaves: OAK, light: shade(OAK, 1.2) });
  segment(p.bark.mesh, { from: [0, 0, 0], to: [0.03, 0.95, 0], r0: 0.13, r1: 0.09 });
  segment(p.bark.mesh, { from: [0.02, 0.7, 0], to: [0.28, 1.15, 0.08], r0: 0.06, r1: 0.04 });
  segment(p.bark.mesh, { from: [0.02, 0.75, 0], to: [-0.22, 1.2, -0.1], r0: 0.06, r1: 0.04 });
  blob(p.leaves.mesh, { center: [0, 1.45, 0], radius: [0.55, 0.45, 0.55], rand });
  blob(p.leaves.mesh, { center: [0.32, 1.25, 0.12], radius: [0.32, 0.28, 0.32], rand });
  blob(p.light.mesh, { center: [-0.26, 1.3, -0.16], radius: [0.34, 0.3, 0.32], rand });
  blob(p.light.mesh, { center: [0.05, 1.82, 0.04], radius: [0.3, 0.24, 0.3], rand });
  await writePiece(OUT, 'nat-carvalho', p);
}

async function birch() {
  const rand = random(23);
  const p = layers({ bark: BIRCH, marks: [52, 48, 44], leaves: [118, 150, 66] });
  segment(p.bark.mesh, { from: [0, 0, 0], to: [-0.03, 1.75, 0.02], r0: 0.07, r1: 0.04 });
  // Riscos pretos da casca: anéis finos um pouco mais largos que o tronco.
  for (const y of [0.3, 0.62, 0.98, 1.3]) {
    segment(p.marks.mesh, { from: [0, y, 0], to: [0, y + 0.04, 0], r0: 0.072, r1: 0.07 });
  }
  blob(p.leaves.mesh, { center: [-0.03, 1.75, 0.02], radius: [0.3, 0.5, 0.3], rand });
  blob(p.leaves.mesh, { center: [0.12, 1.4, -0.06], radius: [0.22, 0.3, 0.22], rand });
  await writePiece(OUT, 'nat-betula', p);
}

async function deadTree() {
  const rand = random(37);
  const p = layers({ bark: DEAD });
  const top = [0.05, 1.5, -0.02];
  segment(p.bark.mesh, { from: [0, 0, 0], to: top, r0: 0.12, r1: 0.05, sides: 5 });
  const branches = [
    { y: 0.7, length: 0.55, tilt: 0.95, heading: 0.4 },
    { y: 0.95, length: 0.5, tilt: 0.85, heading: 2.6 },
    { y: 1.2, length: 0.42, tilt: 0.7, heading: 4.4 },
    { y: 1.35, length: 0.3, tilt: 0.55, heading: 1.5 },
  ];
  for (const { y, length, tilt, heading } of branches) {
    const from = [0.03 * (y / 1.5), y, 0];
    const end = lean(from, length, tilt, heading);
    segment(p.bark.mesh, { from, to: end, r0: 0.045, r1: 0.012, sides: 4 });
    // Um graveto em cada galho: deixa a silhueta seca e retorcida.
    const twig = lean(end, 0.18, tilt * 0.4, heading + (rand() - 0.5) * 2);
    segment(p.bark.mesh, { from: end, to: twig, r0: 0.014, r1: 0.004, sides: 3 });
  }
  await writePiece(OUT, 'nat-arvore-seca', p);
}

async function palm() {
  const p = layers({ bark: [140, 110, 76], fronds: PALM, coco: [96, 66, 40] });
  // Tronco curvo em gomos, cada um um pouco mais fino e inclinado.
  let from = [0, 0, 0];
  const SEGMENTS = 6;
  for (let i = 0; i < SEGMENTS; i += 1) {
    const to = add(from, [0.05 + i * 0.012, 0.36, 0]);
    const r0 = 0.1 - i * 0.008;
    segment(p.bark.mesh, { from, to, r0, r1: r0 - 0.006 });
    from = to;
  }
  const crown = from;
  const FRONDS = 7;
  for (let i = 0; i < FRONDS; i += 1) {
    const heading = (i / FRONDS) * Math.PI * 2;
    const dir = [Math.cos(heading), 0, Math.sin(heading)];
    const side = [-dir[2], 0, dir[0]];
    const mid = add(crown, add(scale(dir, 0.42), [0, 0.12, 0]));
    const tip = add(crown, add(scale(dir, 0.85), [0, -0.22, 0]));
    sheet(p.fronds.mesh, crown, add(mid, scale(side, 0.14)), mid);
    sheet(p.fronds.mesh, crown, mid, add(mid, scale(side, -0.14)));
    sheet(p.fronds.mesh, mid, add(mid, scale(side, 0.12)), tip);
    sheet(p.fronds.mesh, mid, tip, add(mid, scale(side, -0.12)));
  }
  const rand = random(5);
  for (const heading of [0.5, 2.6, 4.6]) {
    const center = add(crown, [Math.cos(heading) * 0.07, -0.06, Math.sin(heading) * 0.07]);
    blob(p.coco.mesh, { center, radius: [0.05, 0.05, 0.05], jitter: 0.05, rand });
  }
  await writePiece(OUT, 'nat-palmeira', p);
}

async function cactus() {
  const p = layers({ body: CACTUS, flower: PETALS[0] });
  segment(p.body.mesh, { from: [0, 0, 0], to: [0, 1.45, 0], r0: 0.13, r1: 0.11, sides: 8 });
  segment(p.body.mesh, {
    from: [0, 1.45, 0],
    to: [0, 1.55, 0],
    r0: 0.11,
    r1: 0,
    sides: 8,
    caps: false,
  });
  // Braços: sai de lado e sobe.
  for (const [side, y, height] of [
    [1, 0.55, 0.5],
    [-1, 0.8, 0.4],
  ]) {
    const elbow = [side * 0.3, y, 0];
    segment(p.body.mesh, {
      from: [side * 0.08, y - 0.04, 0],
      to: elbow,
      r0: 0.08,
      r1: 0.07,
      sides: 6,
    });
    segment(p.body.mesh, {
      from: elbow,
      to: add(elbow, [0, height, 0]),
      r0: 0.075,
      r1: 0.06,
      sides: 6,
    });
  }
  segment(p.flower.mesh, { from: [0, 1.53, 0], to: [0, 1.62, 0], r0: 0.06, r1: 0.03, sides: 5 });
  await writePiece(OUT, 'nat-cacto', p);
}

async function bush() {
  const rand = random(41);
  const p = layers({ leaves: BUSH, light: shade(BUSH, 1.18) });
  blob(p.leaves.mesh, { center: [0, 0.28, 0], radius: [0.4, 0.3, 0.38], rand, flatBottom: true });
  blob(p.light.mesh, { center: [0.18, 0.4, 0.1], radius: [0.22, 0.2, 0.22], rand });
  blob(p.light.mesh, { center: [-0.16, 0.38, -0.12], radius: [0.2, 0.18, 0.2], rand });
  await writePiece(OUT, 'nat-arbusto', p);
}

async function roseBush() {
  const rand = random(43);
  const p = layers({ leaves: shade(BUSH, 0.92), petals: PETALS[0] });
  blob(p.leaves.mesh, { center: [0, 0.3, 0], radius: [0.36, 0.32, 0.36], rand, flatBottom: true });
  for (let i = 0; i < 9; i += 1) {
    const heading = rand() * Math.PI * 2;
    const height = 0.18 + rand() * 0.34;
    const reach = 0.3 * Math.sqrt(1 - ((height - 0.3) / 0.34) ** 2);
    const center = [Math.cos(heading) * reach, height, Math.sin(heading) * reach];
    blob(p.petals.mesh, { center, radius: [0.06, 0.05, 0.06], jitter: 0.1, rand });
  }
  await writePiece(OUT, 'nat-roseira', p);
}

/** Canteiro de flores misturadas: talos finos com uma bolinha de pétalas de cada cor. */
async function flowers() {
  const rand = random(53);
  const petalLayers = Object.fromEntries(PETALS.map((color, index) => [`petal${index}`, color]));
  const p = layers({ stems: GRASS, ...petalLayers });
  for (let i = 0; i < 16; i += 1) {
    const x = (rand() * 2 - 1) * 0.36;
    const z = (rand() * 2 - 1) * 0.36;
    const height = 0.16 + rand() * 0.16;
    segment(p.stems.mesh, { from: [x, 0, z], to: [x, height, z], r0: 0.012, r1: 0.01, sides: 3 });
    const petal = p[`petal${i % PETALS.length}`];
    blob(petal.mesh, {
      center: [x, height + 0.02, z],
      radius: [0.04, 0.03, 0.04],
      jitter: 0.1,
      rand,
    });
  }
  await writePiece(OUT, 'nat-flores', p);
}

/** Tufo de capim: folhas pontudas em leque, cada uma um triângulo de dois lados. */
async function grass() {
  const rand = random(61);
  const p = layers({ blades: GRASS, dry: shade(GRASS, 1.25) });
  for (let tuft = 0; tuft < 5; tuft += 1) {
    const base = [(rand() * 2 - 1) * 0.3, 0, (rand() * 2 - 1) * 0.3];
    for (let i = 0; i < 6; i += 1) {
      const heading = rand() * Math.PI * 2;
      const tip = lean(base, 0.22 + rand() * 0.16, 0.35 + rand() * 0.4, heading);
      const side = [
        Math.cos(heading + Math.PI / 2) * 0.025,
        0,
        Math.sin(heading + Math.PI / 2) * 0.025,
      ];
      const layer = i % 3 === 0 ? p.dry : p.blades;
      sheet(layer.mesh, add(base, side), sub(base, side), tip);
    }
  }
  await writePiece(OUT, 'nat-capim', p);
}

/** Folhas secas espalhadas: losangos achatados quase no chão, em tons de outono. */
async function leafLitter() {
  const rand = random(67);
  const leafLayers = Object.fromEntries(AUTUMN.map((color, index) => [`leaf${index}`, color]));
  const p = layers(leafLayers);
  for (let i = 0; i < 30; i += 1) {
    const cx = (rand() * 2 - 1) * 0.42;
    const cz = (rand() * 2 - 1) * 0.42;
    const y = 0.008 + rand() * 0.02;
    const heading = rand() * Math.PI;
    const along = [Math.cos(heading) * 0.06, 0, Math.sin(heading) * 0.06];
    const across = [-Math.sin(heading) * 0.03, 0.006, Math.cos(heading) * 0.03];
    const center = [cx, y, cz];
    const mesh = p[`leaf${i % AUTUMN.length}`].mesh;
    sheet(mesh, add(center, along), add(center, across), sub(center, along));
    sheet(mesh, sub(center, along), sub(center, across), add(center, along));
  }
  await writePiece(OUT, 'nat-folhas', p);
}

async function pebbles() {
  const rand = random(71);
  const p = layers({ stone: STONE, dark: STONE_DARK });
  for (let i = 0; i < 9; i += 1) {
    const size = 0.04 + rand() * 0.06;
    const center = [(rand() * 2 - 1) * 0.36, size * 0.5, (rand() * 2 - 1) * 0.36];
    const layer = i % 2 === 0 ? p.stone : p.dark;
    blob(layer.mesh, { center, radius: [size, size * 0.65, size * 0.9], jitter: 0.25, rand });
  }
  await writePiece(OUT, 'nat-seixos', p);
}

/** Pedregulho de 2×2 casas com musgo por cima: cobre um canto inteiro do mapa. */
async function boulder() {
  const rand = random(73);
  const p = layers({ stone: STONE, dark: STONE_DARK, moss: MOSS });
  blob(p.stone.mesh, {
    center: [0, 0.5, 0],
    radius: [0.85, 0.62, 0.78],
    jitter: 0.2,
    rand,
    flatBottom: true,
  });
  blob(p.dark.mesh, {
    center: [0.5, 0.3, 0.45],
    radius: [0.4, 0.32, 0.38],
    jitter: 0.2,
    rand,
    flatBottom: true,
  });
  blob(p.moss.mesh, {
    center: [-0.12, 1.02, -0.05],
    radius: [0.42, 0.1, 0.38],
    jitter: 0.15,
    rand,
  });
  await writePiece(OUT, 'nat-pedregulho', p);
}

async function mushrooms() {
  const rand = random(79);
  const p = layers({ stem: CAP_LIGHT, cap: CAP, spots: [240, 234, 220] });
  const shrooms = [
    { x: -0.12, z: 0.05, height: 0.28, r: 0.13 },
    { x: 0.16, z: -0.08, height: 0.18, r: 0.09 },
    { x: 0.05, z: 0.22, height: 0.12, r: 0.06 },
  ];
  for (const { x, z, height, r } of shrooms) {
    segment(p.stem.mesh, { from: [x, 0, z], to: [x, height, z], r0: r * 0.35, r1: r * 0.28 });
    segment(p.cap.mesh, {
      from: [x, height - 0.02, z],
      to: [x, height + r * 0.8, z],
      r0: r,
      r1: 0,
      sides: 8,
    });
    blob(p.spots.mesh, {
      center: [x + r * 0.35, height + r * 0.35, z],
      radius: [0.018, 0.012, 0.018],
      jitter: 0,
      rand,
    });
  }
  await writePiece(OUT, 'nat-cogumelos', p);
}

/** Tronco caído de 2 casas (deitado ao longo de x), com o miolo claro nas pontas. */
async function log() {
  const p = layers({ bark: BARK_DARK, core: [176, 140, 96], moss: MOSS });
  segment(p.bark.mesh, {
    from: [-0.9, 0.2, 0],
    to: [0.9, 0.18, 0],
    r0: 0.2,
    r1: 0.17,
    sides: 7,
    caps: false,
  });
  segment(p.core.mesh, {
    from: [-0.905, 0.2, 0],
    to: [-0.9, 0.2, 0],
    r0: 0.18,
    r1: 0.18,
    sides: 7,
  });
  segment(p.core.mesh, {
    from: [0.9, 0.18, 0],
    to: [0.905, 0.18, 0],
    r0: 0.155,
    r1: 0.155,
    sides: 7,
  });
  segment(p.bark.mesh, {
    from: [0.2, 0.3, 0.08],
    to: [0.45, 0.55, 0.22],
    r0: 0.05,
    r1: 0.02,
    sides: 4,
  });
  const rand = random(83);
  blob(p.moss.mesh, { center: [-0.3, 0.36, 0], radius: [0.3, 0.06, 0.14], jitter: 0.15, rand });
  await writePiece(OUT, 'nat-tronco', p);
}

async function stump() {
  const p = layers({ bark: BARK, core: [176, 140, 96] });
  segment(p.bark.mesh, {
    from: [0, 0, 0],
    to: [0, 0.32, 0],
    r0: 0.24,
    r1: 0.19,
    sides: 8,
    caps: false,
  });
  segment(p.core.mesh, { from: [0, 0.3, 0], to: [0, 0.325, 0], r0: 0.19, r1: 0.18, sides: 8 });
  // Raízes saindo da base.
  for (const heading of [0.3, 2.2, 4.1]) {
    const from = [Math.cos(heading) * 0.12, 0.12, Math.sin(heading) * 0.12];
    const to = [Math.cos(heading) * 0.38, 0, Math.sin(heading) * 0.38];
    segment(p.bark.mesh, { from, to, r0: 0.06, r1: 0.025, sides: 4 });
  }
  await writePiece(OUT, 'nat-toco', p);
}

await pine();
await oak();
await birch();
await deadTree();
await palm();
await cactus();
await bush();
await roseBush();
await flowers();
await grass();
await leafLitter();
await pebbles();
await boulder();
await mushrooms();
await log();
await stump();
