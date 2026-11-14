// Gera as peças do estilo cyberpunk (RPG-42): paredes de concreto escuro com faixa de neon
// (lisa, com janela acesa, com porta de enrolar e vitrine), em neon rosa e ciano; pisos de
// asfalto, calçada, grade e praça com junta acesa; e os adereços da rua: poste de neon,
// letreiro em pé, painel de neon, holograma e máquina de venda.
// O neon é cor de emissão no material: brilha igual no escuro, sem depender da luz da cena.
// Formato igual ao das peças de pacote (ver piece-mesh.mjs); parede com 1 casa de largura e
// 2 de altura, igual dos dois lados.
// uso: node scripts/assets/cyber-pieces.mjs <public/assets/cyberpunk>
import { MeshoptEncoder } from 'meshoptimizer';
import { glow, layers, shade, wallCore, writePiece } from './piece-mesh.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) throw new Error('uso: node scripts/assets/cyber-pieces.mjs <public/assets/cyberpunk>');

const WALL = { width: 1, height: 2, half: 0.06 };
const HALF_W = WALL.width / 2;
const BASE = { height: 0.12, half: 0.07 };
/** Faixa de neon perto do topo: as paredes vizinhas emendam numa linha só. */
const STRIP = { y0: 1.8, y1: 1.85, half: 0.075 };
const WINDOW = { x0: -0.3, x1: 0.3, y0: 0.65, y1: 1.55 };
const DOOR = { x0: -0.3, x1: 0.3, y0: 0, y1: 1.5 };
const SHOP = { x0: -0.44, x1: 0.44, y0: 0.22, y1: 1.4 };
const FRAME = 0.035;
/** Ripas da porta de enrolar. */
const SHUTTER_SLAT = 0.1;

const CONCRETE = [58, 60, 70];
const CONCRETE_DARK = shade(CONCRETE, 0.62);
const METAL = [84, 88, 100];
const METAL_DARK = [40, 42, 50];
const WINDOW_LIGHT = [96, 150, 205];

const ACCENTS = [
  { key: 'rosa', label: 'rosa', neon: [255, 64, 176], shop: [255, 160, 214] },
  { key: 'ciano', label: 'ciano', neon: [40, 226, 255], shop: [160, 236, 255] },
];
const PINK = ACCENTS[0].neon;
const CYAN = ACCENTS[1].neon;
const VIOLET = [150, 70, 255];

// ---------------------------------------------------------------------------
// Paredes
// ---------------------------------------------------------------------------

function baseAndStrip(parts, door) {
  const z = { z0: -BASE.half, z1: BASE.half };
  const spans = door
    ? [
        [-HALF_W, door.x0],
        [door.x1, HALF_W],
      ]
    : [[-HALF_W, HALF_W]];
  for (const [x0, x1] of spans) {
    parts.base.mesh.box({ x0, x1, y0: 0, y1: BASE.height, ...z }, ['ny']);
  }
  parts.neon.mesh.box({
    x0: -HALF_W,
    x1: HALF_W,
    y0: STRIP.y0,
    y1: STRIP.y1,
    z0: -STRIP.half,
    z1: STRIP.half,
  });
}

/** Moldura em volta de um vão, saltada dos dois lados da parede. */
function frameAround(mesh, { x0, x1, y0, y1 }, bottom) {
  const z = { z0: -WALL.half - 0.01, z1: WALL.half + 0.01 };
  mesh.box({ x0: x0 - FRAME, x1: x0, y0, y1: y1 + FRAME, ...z });
  mesh.box({ x0: x1, x1: x1 + FRAME, y0, y1: y1 + FRAME, ...z });
  mesh.box({ x0, x1, y0: y1, y1: y1 + FRAME, ...z });
  if (bottom) mesh.box({ x0, x1, y0: y0 - FRAME, y1: y0, ...z });
}

/** Vidro aceso no meio da espessura do vão (vale para os dois lados). */
function litPane(mesh, { x0, x1, y0, y1 }) {
  mesh.box({ x0, x1, y0, y1, z0: -0.006, z1: 0.006 });
}

function plainWall(parts) {
  wallCore(parts.concrete.mesh, WALL, null);
  baseAndStrip(parts, null);
  // Juntas das placas de concreto, uma de cada lado.
  for (const x of [-0.17, 0.17]) {
    parts.base.mesh.box({
      x0: x - 0.008,
      x1: x + 0.008,
      y0: BASE.height,
      y1: STRIP.y0,
      z0: -WALL.half - 0.004,
      z1: WALL.half + 0.004,
    });
  }
}

function windowWall(parts) {
  wallCore(parts.concrete.mesh, WALL, WINDOW);
  baseAndStrip(parts, null);
  frameAround(parts.metal.mesh, WINDOW, true);
  litPane(parts.window.mesh, WINDOW);
  // Persiana meio fechada: a luz aparece pelas frestas.
  for (let y = WINDOW.y1 - 0.06; y > WINDOW.y1 - 0.42; y -= 0.09) {
    parts.metal.mesh.box({
      x0: WINDOW.x0,
      x1: WINDOW.x1,
      y0: y - 0.035,
      y1: y,
      z0: -0.02,
      z1: 0.02,
    });
  }
}

function doorWall(parts) {
  wallCore(parts.concrete.mesh, WALL, DOOR);
  baseAndStrip(parts, DOOR);
  frameAround(parts.neon.mesh, DOOR, false);
  // Porta de enrolar de metal, com as ripas marcadas dos dois lados.
  parts.shutter.mesh.box({ ...DOOR, z0: -0.02, z1: 0.02 });
  for (let y = DOOR.y0 + SHUTTER_SLAT; y < DOOR.y1; y += SHUTTER_SLAT) {
    parts.metal.mesh.box({
      x0: DOOR.x0,
      x1: DOOR.x1,
      y0: y - 0.012,
      y1: y,
      z0: -0.026,
      z1: 0.026,
    });
  }
}

function shopWall(parts) {
  wallCore(parts.concrete.mesh, WALL, SHOP);
  baseAndStrip(parts, null);
  frameAround(parts.metal.mesh, SHOP, true);
  litPane(parts.shop.mesh, SHOP);
  // Letreiro de neon em cima da vitrine.
  parts.neon.mesh.box({
    x0: SHOP.x0 + 0.06,
    x1: SHOP.x1 - 0.06,
    y0: SHOP.y1 + 0.1,
    y1: SHOP.y1 + 0.28,
    z0: -WALL.half - 0.03,
    z1: WALL.half + 0.03,
  });
}

// ---------------------------------------------------------------------------
// Pisos (o topo fica em y = 0, como os pisos de pacote)
// ---------------------------------------------------------------------------

/** Retângulo deitado, virado para cima, na altura y. */
function flat(mesh, { x0, x1, z0, z1 }, y = 0) {
  mesh.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]);
}

const FULL = { x0: -0.5, x1: 0.5, z0: -0.5, z1: 0.5 };
/** Detalhe do piso fica um fio acima dele, para não brigar na profundidade. */
const DETAIL_Y = 0.002;
const SEAM = 0.012;

/** Juntas em grade (n × n placas), sem as da borda: a casa vizinha completa. */
function seams(mesh, count) {
  for (let index = 1; index < count; index += 1) {
    const at = -0.5 + index / count;
    flat(mesh, { x0: at - SEAM, x1: at + SEAM, z0: -0.5, z1: 0.5 }, DETAIL_Y);
    flat(mesh, { x0: -0.5, x1: 0.5, z0: at - SEAM, z1: at + SEAM }, DETAIL_Y * 1.5);
  }
}

function asphalt(parts) {
  flat(parts.ground.mesh, FULL);
  // Poças que refletem o neon da rua.
  flat(parts.puddle.mesh, { x0: -0.32, x1: -0.06, z0: 0.08, z1: 0.3 }, DETAIL_Y);
  flat(parts.puddle.mesh, { x0: 0.14, x1: 0.36, z0: -0.34, z1: -0.18 }, DETAIL_Y);
}

function sidewalk(parts) {
  flat(parts.ground.mesh, FULL);
  seams(parts.seam.mesh, 2);
}

function grate(parts) {
  flat(parts.ground.mesh, FULL);
  for (let index = 1; index < 6; index += 1) {
    const at = -0.5 + index / 6;
    flat(parts.seam.mesh, { x0: at - 0.01, x1: at + 0.01, z0: -0.46, z1: 0.46 }, DETAIL_Y);
  }
}

function neonPlaza(parts) {
  flat(parts.ground.mesh, FULL);
  seams(parts.seam.mesh, 2);
}

// ---------------------------------------------------------------------------
// Adereços
// ---------------------------------------------------------------------------

/** Prisma de n lados em pé (cilindro low-poly), com tampa em cima. */
function prism(mesh, { cx = 0, cz = 0, radius, y0, y1, sides = 8 }) {
  const ring = (y) =>
    Array.from({ length: sides }, (_, index) => {
      const angle = (index / sides) * Math.PI * 2;
      return [cx + Math.cos(angle) * radius, y, cz - Math.sin(angle) * radius];
    });
  const bottom = ring(y0);
  const top = ring(y1);
  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    mesh.quad(bottom[index], bottom[next], top[next], top[index]);
  }
  for (let index = 1; index < sides - 1; index += 1) mesh.tri(top[0], top[index], top[index + 1]);
}

function neonPost(parts) {
  parts.metal.mesh.box({ x0: -0.12, x1: 0.12, y0: 0, y1: 0.1, z0: -0.12, z1: 0.12 }, ['ny']);
  parts.metal.mesh.box({ x0: -0.04, x1: 0.04, y0: 0.1, y1: 2.4, z0: -0.04, z1: 0.04 }, ['ny']);
  parts.metal.mesh.box({ x0: -0.04, x1: 0.38, y0: 2.4, y1: 2.46, z0: -0.04, z1: 0.04 });
  parts.neon.mesh.box({ x0: 0.06, x1: 0.36, y0: 2.34, y1: 2.4, z0: -0.025, z1: 0.025 });
  // Anel aceso no meio do poste: de longe ainda dá para ver onde ele está.
  parts.accent.mesh.box({ x0: -0.045, x1: 0.045, y0: 1.2, y1: 1.5, z0: -0.045, z1: 0.045 });
}

/** Letreiro alto em pé: placa fina com borda de neon e "letras" acesas dos dois lados. */
function tallSign(parts) {
  parts.metal.mesh.box({ x0: -0.05, x1: 0.05, y0: 0, y1: 0.5, z0: -0.05, z1: 0.05 }, ['ny']);
  const panel = { x0: -0.07, x1: 0.07, y0: 0.5, y1: 3, z0: -0.3, z1: 0.3 };
  parts.body.mesh.box(panel);
  const out = 0.012;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? panel.x0 - out : panel.x1;
    const x1 = side < 0 ? panel.x0 : panel.x1 + out;
    parts.neon.mesh.box({ x0, x1, y0: panel.y0, y1: panel.y0 + 0.04, z0: panel.z0, z1: panel.z1 });
    parts.neon.mesh.box({ x0, x1, y0: panel.y1 - 0.04, y1: panel.y1, z0: panel.z0, z1: panel.z1 });
    parts.neon.mesh.box({ x0, x1, y0: panel.y0, y1: panel.y1, z0: panel.z0, z1: panel.z0 + 0.04 });
    parts.neon.mesh.box({ x0, x1, y0: panel.y0, y1: panel.y1, z0: panel.z1 - 0.04, z1: panel.z1 });
    for (let y = panel.y1 - 0.38; y > panel.y0 + 0.1; y -= 0.42) {
      parts.letters.mesh.box({ x0, x1, y0: y, y1: y + 0.26, z0: -0.16, z1: 0.16 });
    }
  }
}

/** Painel de neon de 2 casas sobre dois pés, com a tela acesa dos dois lados. */
function billboard(parts) {
  for (const x of [-0.75, 0.75]) {
    parts.metal.mesh.box({ x0: x - 0.05, x1: x + 0.05, y0: 0, y1: 1.6, z0: -0.05, z1: 0.05 }, [
      'ny',
    ]);
  }
  const panel = { x0: -0.95, x1: 0.95, y0: 1.6, y1: 2.55, z0: -0.05, z1: 0.05 };
  parts.body.mesh.box(panel);
  const z = { z0: panel.z0 - 0.012, z1: panel.z1 + 0.012 };
  parts.screen.mesh.box({ x0: -0.85, x1: 0.85, y0: 1.7, y1: 2.45, ...z });
  const zz = { z0: z.z0 - 0.006, z1: z.z1 + 0.006 };
  parts.neon.mesh.box({ x0: panel.x0, x1: panel.x1, y0: panel.y1 - 0.04, y1: panel.y1, ...zz });
  parts.neon.mesh.box({ x0: panel.x0, x1: panel.x1, y0: panel.y0, y1: panel.y0 + 0.04, ...zz });
  parts.neon.mesh.box({ x0: panel.x0, x1: panel.x0 + 0.04, y0: panel.y0, y1: panel.y1, ...zz });
  parts.neon.mesh.box({ x0: panel.x1 - 0.04, x1: panel.x1, y0: panel.y0, y1: panel.y1, ...zz });
  parts.letters.mesh.box({ x0: -0.6, x1: 0.2, y0: 2.1, y1: 2.3, ...zz });
  parts.letters.mesh.box({ x0: -0.6, x1: 0.6, y0: 1.85, y1: 1.97, ...zz });
}

/** Projetor redondo e um vulto translúcido aceso em pé em cima dele. */
function hologram(parts) {
  prism(parts.metal.mesh, { radius: 0.32, y0: 0, y1: 0.1, sides: 10 });
  prism(parts.neon.mesh, { radius: 0.26, y0: 0.1, y1: 0.13, sides: 10 });
  const figure = parts.holo.mesh;
  figure.box({ x0: -0.1, x1: -0.02, y0: 0.18, y1: 0.85, z0: -0.05, z1: 0.05 });
  figure.box({ x0: 0.02, x1: 0.1, y0: 0.18, y1: 0.85, z0: -0.05, z1: 0.05 });
  figure.box({ x0: -0.14, x1: 0.14, y0: 0.85, y1: 1.4, z0: -0.07, z1: 0.07 });
  figure.box({ x0: -0.22, x1: -0.15, y0: 0.85, y1: 1.36, z0: -0.04, z1: 0.04 });
  figure.box({ x0: 0.15, x1: 0.22, y0: 0.85, y1: 1.36, z0: -0.04, z1: 0.04 });
  figure.box({ x0: -0.08, x1: 0.08, y0: 1.44, y1: 1.62, z0: -0.08, z1: 0.08 });
  // Linhas de varredura do projetor, em volta do vulto.
  for (const y of [0.5, 1.0, 1.5]) prism(parts.scan.mesh, { radius: 0.24, y0: y, y1: y + 0.015 });
}

/** Máquina de venda virada para +z: vitrine acesa com as fileiras de produtos. */
function vendingMachine(parts) {
  const body = { x0: -0.34, x1: 0.34, y0: 0, y1: 1.8, z0: -0.28, z1: 0.28 };
  parts.body.mesh.box(body, ['ny']);
  const front = body.z1;
  parts.screen.mesh.box({ x0: -0.29, x1: 0.12, y0: 0.5, y1: 1.7, z0: front, z1: front + 0.01 });
  for (let y = 0.62; y < 1.65; y += 0.22) {
    for (let x = -0.25; x < 0.1; x += 0.11) {
      parts.goods.mesh.box({
        x0: x,
        x1: x + 0.07,
        y0: y,
        y1: y + 0.12,
        z0: front + 0.01,
        z1: front + 0.03,
      });
    }
  }
  parts.metal.mesh.box({ x0: 0.16, x1: 0.3, y0: 0.5, y1: 1.7, z0: front, z1: front + 0.015 });
  parts.neon.mesh.box({
    x0: 0.19,
    x1: 0.27,
    y0: 1.38,
    y1: 1.6,
    z0: front + 0.015,
    z1: front + 0.02,
  });
  parts.metal.mesh.box({ x0: -0.29, x1: 0.12, y0: 0.18, y1: 0.36, z0: front, z1: front + 0.04 });
  parts.neon.mesh.box({ x0: body.x0, x1: body.x1, y0: 1.8, y1: 1.86, z0: body.z0, z1: body.z1 });
}

// ---------------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------------

await MeshoptEncoder.ready;

for (const { key, neon, shop } of ACCENTS) {
  const wallLayers = () =>
    layers({
      concrete: CONCRETE,
      base: CONCRETE_DARK,
      metal: METAL,
      shutter: METAL_DARK,
      neon: glow(neon),
      window: glow(WINDOW_LIGHT),
      shop: glow(shop),
    });
  const plain = wallLayers();
  plainWall(plain);
  await writePiece(OUT, `cyb-concreto-${key}`, plain);
  const windowed = wallLayers();
  windowWall(windowed);
  await writePiece(OUT, `cyb-concreto-${key}-janela`, windowed);
  const door = wallLayers();
  doorWall(door);
  await writePiece(OUT, `cyb-concreto-${key}-porta`, door);
  const shopfront = wallLayers();
  shopWall(shopfront);
  await writePiece(OUT, `cyb-vitrine-${key}`, shopfront);
}

const road = layers({ ground: [30, 32, 40], puddle: [52, 62, 86] });
asphalt(road);
await writePiece(OUT, 'cyb-asfalto', road);

const walk = layers({ ground: [64, 66, 76], seam: [40, 42, 50] });
sidewalk(walk);
await writePiece(OUT, 'cyb-calcada', walk);

const floorGrate = layers({ ground: [56, 60, 70], seam: [26, 28, 34] });
grate(floorGrate);
await writePiece(OUT, 'cyb-piso-grade', floorGrate);

const plaza = layers({ ground: [36, 38, 48], seam: glow(CYAN) });
neonPlaza(plaza);
await writePiece(OUT, 'cyb-praca-neon', plaza);

const post = layers({ metal: METAL_DARK, neon: glow(CYAN), accent: glow(PINK) });
neonPost(post);
await writePiece(OUT, 'cyb-poste-neon', post);

const sign = layers({
  metal: METAL_DARK,
  body: [30, 30, 38],
  neon: glow(PINK),
  letters: glow(CYAN),
});
tallSign(sign);
await writePiece(OUT, 'cyb-letreiro', sign);

const board = layers({
  metal: METAL_DARK,
  body: [30, 30, 38],
  screen: glow(shade(VIOLET, 0.55)),
  neon: glow(CYAN),
  letters: glow(PINK),
});
billboard(board);
await writePiece(OUT, 'cyb-painel-neon', board);

const holo = layers({
  metal: METAL_DARK,
  neon: glow(CYAN),
  holo: glow([90, 220, 255], 0.5),
  scan: glow([90, 220, 255], 0.35),
});
hologram(holo);
await writePiece(OUT, 'cyb-holograma', holo);

const vending = layers({
  body: [150, 34, 62],
  screen: glow([255, 236, 210]),
  goods: [60, 120, 200],
  metal: METAL,
  neon: glow(CYAN),
});
vendingMachine(vending);
await writePiece(OUT, 'cyb-maquina-venda', vending);
