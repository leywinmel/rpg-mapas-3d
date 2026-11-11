// Gera as paredes de tijolo do estilo moderno com relevo de verdade (não uma foto de tijolo numa
// placa lisa): cada fiada é uma faixa saltada da massa, com sulco em cima e embaixo. As juntas
// verticais e o tom de cada tijolo vêm da textura de brick-texture.mjs.
// Um tijolo por caixa custava 15 vezes mais triângulos que a cidade inteira; uma faixa por fiada
// fica perto do custo das paredes antigas.
// Os dois lados são iguais e as duas paredes (lisa e com janela) usam as mesmas fiadas e a mesma
// textura, então a casa fecha sem emenda.
// Formato igual ao das paredes de pacote: 1 casa de largura, 2 de altura, centro em x e z.
// uso: node brick-walls.mjs <public/assets/modern>
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { COURSE, JOINT, MORTAR_RGB, TEXTURE_URI } from './brick-layout.mjs';

const [OUT] = process.argv.slice(2);

const WIDTH = 1;
const HEIGHT = 2;
const HALF_THICKNESS = 0.05;
/** Massa entre as fiadas: fica recuada, e o tijolo salta dela. */
const MORTAR_DEPTH = 0.036;

/** Janela: abertura alinhada às fiadas de tijolo, para não sobrar tijolo cortado na altura. */
const WINDOW = { x0: -0.22, x1: 0.22, y0: 0.7, y1: 1.6 };
const FRAME = 0.035;
const SILL_OUT = 0.03;

/** sRGB (0 a 255) para a cor linear que o glTF espera no fator do material. */
const linear = (rgb) => rgb.map((value) => ((value / 255 + 0.055) / 1.055) ** 2.4);

const COLORS = {
  // O tijolo é todo textura: o fator fica neutro.
  brick: [1, 1, 1],
  mortar: linear(MORTAR_RGB),
  frame: [0.9, 0.88, 0.84],
  sill: [0.72, 0.7, 0.66],
  glass: [0.55, 0.68, 0.75],
};

/** Malha simples: listas de posição, normal e UV, em quadriláteros. */
function builder() {
  const positions = [];
  const normals = [];
  const uvs = [];
  const quad = (corners, normal) => {
    // Triângulos 0-1-2 e 0-2-3, em sentido anti-horário visto de quem está do lado da normal.
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const [x, y, z] = corners[index];
      positions.push(x, y, z);
      normals.push(...normal);
      // Do lado de trás a textura corre ao contrário, para os dois lados lerem igual.
      uvs.push(z < 0 ? WIDTH / 2 - x : x + WIDTH / 2, HEIGHT - y);
    }
  };
  /** Caixa de x0..x1, y0..y1, z0..z1; `skip` tira faces que ficam escondidas. */
  const box = ({ x0, x1, y0, y1, z0, z1 }, skip = []) => {
    const faces = {
      px: [[[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0]],
      nx: [[[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]],
      py: [[[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0]],
      ny: [[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0]],
      pz: [[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]],
      nz: [[[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1]],
    };
    for (const [name, [corners, normal]] of Object.entries(faces)) {
      if (!skip.includes(name)) quad(corners, normal);
    }
  };
  return { positions, normals, uvs, quad, box };
}

/** Pedaços [x0, x1] de uma fiada, tirando o vão da janela quando a fiada passa por ele. */
function rowSpans(y0, y1, opening) {
  if (!opening || y1 <= opening.y0 || y0 >= opening.y1) return [[-WIDTH / 2, WIDTH / 2]];
  return [
    [-WIDTH / 2, opening.x0],
    [opening.x1, WIDTH / 2],
  ];
}

/** Uma faixa saltada por fiada, dos dois lados; o vão da janela corta a fiada. */
function courses(mesh, opening) {
  const rows = Math.round(HEIGHT / COURSE);
  for (let row = 0; row < rows; row += 1) {
    const y0 = row * COURSE + JOINT / 2;
    const y1 = (row + 1) * COURSE - JOINT / 2;
    for (const [x0, x1] of rowSpans(row * COURSE, (row + 1) * COURSE, opening)) {
      for (const side of [1, -1]) {
        const z = side === 1 ? { z0: MORTAR_DEPTH, z1: HALF_THICKNESS } : { z0: -HALF_THICKNESS, z1: -MORTAR_DEPTH };
        // A ponta da faixa só aparece no vão da janela: na ponta da parede a vizinha encosta.
        const skip = [side === 1 ? 'nz' : 'pz'];
        if (x0 === -WIDTH / 2) skip.push('nx');
        if (x1 === WIDTH / 2) skip.push('px');
        mesh.box({ x0, x1, y0, y1, ...z }, skip);
      }
    }
  }
}

/** Massa (o miolo da parede), com o vão da janela quando houver. */
function mortar(mesh, opening) {
  const core = { z0: -MORTAR_DEPTH, z1: MORTAR_DEPTH };
  // As pontas da parede (x = ±0.5) mostram a massa por inteiro, até a face dos tijolos.
  const ends = { z0: -HALF_THICKNESS, z1: HALF_THICKNESS };
  if (!opening) {
    mesh.box({ x0: -WIDTH / 2, x1: WIDTH / 2, y0: 0, y1: HEIGHT, ...core }, ['px', 'nx', 'ny']);
  } else {
    const { x0, x1, y0, y1 } = opening;
    mesh.box({ x0: -WIDTH / 2, x1: x0, y0: 0, y1: HEIGHT, ...core }, ['px', 'nx', 'ny']);
    mesh.box({ x0: x1, x1: WIDTH / 2, y0: 0, y1: HEIGHT, ...core }, ['px', 'nx', 'ny']);
    mesh.box({ x0, x1, y0: 0, y1: y0, ...core }, ['px', 'nx', 'ny', 'py']);
    mesh.box({ x0, x1, y0: y1, y1: HEIGHT, ...core }, ['px', 'nx', 'ny']);
  }
  mesh.box({ x0: -WIDTH / 2, x1: -WIDTH / 2 + 0.001, y0: 0, y1: HEIGHT, ...ends }, ['px', 'py', 'ny', 'pz', 'nz']);
  mesh.box({ x0: WIDTH / 2 - 0.001, x1: WIDTH / 2, y0: 0, y1: HEIGHT, ...ends }, ['nx', 'py', 'ny', 'pz', 'nz']);
  // Topo da parede: liso, da largura toda (quem empilha um andar em cima não vê a fresta).
  mesh.box({ x0: -WIDTH / 2, x1: WIDTH / 2, y0: HEIGHT - 0.001, y1: HEIGHT, ...ends }, ['ny', 'px', 'nx', 'pz', 'nz']);
}

function windowParts(frame, sill, glass) {
  const { x0, x1, y0, y1 } = WINDOW;
  const depth = { z0: -HALF_THICKNESS + 0.005, z1: HALF_THICKNESS - 0.005 };
  frame.box({ x0, x1: x0 + FRAME, y0, y1, ...depth });
  frame.box({ x0: x1 - FRAME, x1, y0, y1, ...depth });
  frame.box({ x0: x0 + FRAME, x1: x1 - FRAME, y0: y1 - FRAME, y1, ...depth });
  frame.box({ x0: x0 + FRAME, x1: x1 - FRAME, y0, y1: y0 + FRAME, ...depth });
  // Travessa no meio (janela de duas folhas na vertical).
  const middle = (y0 + y1) / 2;
  frame.box({ x0: x0 + FRAME, x1: x1 - FRAME, y0: middle - FRAME / 3, y1: middle + FRAME / 3, z0: -0.012, z1: 0.012 });
  // Peitoril saltado dos dois lados.
  sill.box({ x0: x0 - 0.03, x1: x1 + 0.03, y0: y0 - 0.035, y1: y0, z0: -HALF_THICKNESS - SILL_OUT, z1: HALF_THICKNESS + SILL_OUT });
  // Vidro no meio da espessura, com face para os dois lados.
  glass.box({ x0: x0 + FRAME, x1: x1 - FRAME, y0: y0 + FRAME, y1: y1 - FRAME, z0: -0.004, z1: 0.004 }, ['px', 'nx', 'py', 'ny']);
}

const BRICK_MATERIAL = 'MI_BrickRelief';

async function write(key, parts) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const mesh = doc.createMesh(key);
  for (const { name, color, data, glass } of parts) {
    if (data.positions.length === 0) continue;
    const material = doc
      .createMaterial(name)
      .setBaseColorFactor([...color, glass ? 0.45 : 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(glass ? 0.15 : 0.92);
    if (glass) material.setAlphaMode('BLEND');
    const prim = doc
      .createPrimitive()
      .setMaterial(material)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(data.positions)).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(data.normals)).setBuffer(buffer));
    // Só o tijolo usa textura: nas outras camadas o fator do material basta.
    if (name === BRICK_MATERIAL) {
      prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(data.uvs)).setBuffer(buffer));
    }
    mesh.addPrimitive(prim);
  }
  doc.createScene().addChild(doc.createNode(key).setMesh(mesh));
  await doc.transform(
    weld(),
    dedup({ propertyTypes: [PropertyType.ACCESSOR] }),
    // A textura só entra no JSON no fim: sem ela, o prune acharia a UV inútil e a apagaria.
    prune({ keepAttributes: true }),
    quantize({ pattern: /^(POSITION|NORMAL)$/, quantizePosition: 16, quantizeNormal: 8 }),
    reorder({ encoder: MeshoptEncoder }),
  );
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  doc.getRoot().listBuffers().forEach((b) => b.setURI(`${key}.bin`));
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const { json, resources } = await io.writeJSON(doc, { basename: key });
  // A textura é um arquivo compartilhado em textures/, como nas paredes dos pacotes.
  json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  json.images = [{ name: 'T_BrickRelief', mimeType: 'image/webp', uri: TEXTURE_URI }];
  json.textures = [{ sampler: 0, extensions: { EXT_texture_webp: { source: 0 } } }];
  json.materials.find((material) => material.name === BRICK_MATERIAL).pbrMetallicRoughness.baseColorTexture = { index: 0 };
  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), 'EXT_texture_webp'])];
  json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), 'EXT_texture_webp'])];
  writeFileSync(join(OUT, `${key}.gltf`), JSON.stringify(json));
  for (const [name, bytes] of Object.entries(resources)) writeFileSync(join(OUT, name), bytes);
  const triangles = parts.reduce((sum, part) => sum + part.data.positions.length / 9, 0);
  console.log(key, 'triângulos', triangles);
}

const here = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [join(here, 'brick-texture.mjs'), join(OUT, TEXTURE_URI)], { stdio: 'inherit' });
await MeshoptEncoder.ready;
for (const [key, opening] of [
  ['mod-parede-tijolo', null],
  ['mod-tijolo-janela', WINDOW],
]) {
  const brick = builder();
  const mortarMesh = builder();
  const frame = builder();
  const sill = builder();
  const glass = builder();
  courses(brick, opening);
  mortar(mortarMesh, opening);
  if (opening) windowParts(frame, sill, glass);
  await write(key, [
    { name: BRICK_MATERIAL, color: COLORS.brick, data: brick },
    { name: 'MI_Mortar', color: COLORS.mortar, data: mortarMesh },
    { name: 'MI_WindowFrame', color: COLORS.frame, data: frame },
    { name: 'MI_Sill', color: COLORS.sill, data: sill },
    { name: 'MI_GlassPane', color: COLORS.glass, data: glass, glass: true },
  ]);
}
