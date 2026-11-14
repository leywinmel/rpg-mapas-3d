// Malha de faces chapadas e gravação em glTF comprimido das peças geradas por script
// (casas modernas, cyberpunk). Formato igual ao das peças de pacote: origem no centro do
// footprint, base em y = 0, uma casa = 1 unidade.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

/** sRGB (0 a 255) para a cor linear que o glTF espera no fator do material. */
export const linear = (rgb) => rgb.map((value) => ((value / 255 + 0.055) / 1.055) ** 2.4);
export const shade = (rgb, factor) => rgb.map((value) => Math.round(value * factor));

/**
 * Camada que brilha sozinha (neon, tela, janela acesa): a cor vira a emissão do material e
 * aparece igual no escuro, sem depender da luz da cena.
 */
export const glow = (color, opacity = 1) => ({ color, glow: true, opacity });

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalOf(a, b, c) {
  const u = sub(b, a);
  const v = sub(c, a);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...n) || 1;
  return n.map((value) => value / length);
}

/** Malha de faces chapadas (cada face com a própria normal: é o visual low-poly do site). */
export function builder() {
  const positions = [];
  const normals = [];
  const tri = (a, b, c) => {
    const normal = normalOf(a, b, c);
    for (const point of [a, b, c]) {
      positions.push(...point);
      normals.push(...normal);
    }
  };
  /** Quadrilátero em sentido anti-horário visto de fora. */
  const quad = (a, b, c, d) => {
    tri(a, b, c);
    tri(a, c, d);
  };
  const box = ({ x0, x1, y0, y1, z0, z1 }, skip = []) => {
    const faces = {
      px: [
        [x1, y0, z1],
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
      ],
      nx: [
        [x0, y0, z0],
        [x0, y0, z1],
        [x0, y1, z1],
        [x0, y1, z0],
      ],
      py: [
        [x0, y1, z1],
        [x1, y1, z1],
        [x1, y1, z0],
        [x0, y1, z0],
      ],
      ny: [
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y0, z1],
        [x0, y0, z1],
      ],
      pz: [
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1],
      ],
      nz: [
        [x1, y0, z0],
        [x0, y0, z0],
        [x0, y1, z0],
        [x1, y1, z0],
      ],
    };
    for (const [name, corners] of Object.entries(faces)) {
      if (!skip.includes(name)) quad(...corners);
    }
  };
  return { positions, normals, tri, quad, box };
}

/** Uma camada da peça: malha e cor do material (ou `glow(cor)` para a que brilha). */
export function layers(spec) {
  return Object.fromEntries(
    Object.entries(spec).map(([name, value]) => {
      const {
        color,
        glow: lit = false,
        opacity = 1,
      } = Array.isArray(value) ? { color: value } : value;
      return [name, { color, glow: lit, opacity, mesh: builder() }];
    }),
  );
}

/**
 * Parede de 1 casa com um vão (ou sem); o vão corta a parede inteira na espessura.
 * `wall`: { width, height, half } (half = metade da espessura).
 */
export function wallCore(mesh, wall, opening) {
  const HALF_W = wall.width / 2;
  const z = { z0: -wall.half, z1: wall.half };
  const top = wall.height;
  if (!opening) {
    mesh.box({ x0: -HALF_W, x1: HALF_W, y0: 0, y1: top, ...z }, ['ny']);
    return;
  }
  const { x0, x1, y0, y1 } = opening;
  mesh.box({ x0: -HALF_W, x1: x0, y0: 0, y1: top, ...z }, ['ny', 'px']);
  mesh.box({ x0: x1, x1: HALF_W, y0: 0, y1: top, ...z }, ['ny', 'nx']);
  if (y0 > 0) mesh.box({ x0, x1, y0: 0, y1: y0, ...z }, ['ny', 'px', 'nx']);
  mesh.box({ x0, x1, y0: y1, y1: top, ...z }, ['px', 'nx']);
  // Faces de dentro do vão (o "peitoril" e as laterais aparecem de perto).
  mesh.box({ x0: x0 - 0.001, x1: x0, y0, y1, ...z }, ['nx', 'py', 'ny', 'pz', 'nz']);
  mesh.box({ x0: x1, x1: x1 + 0.001, y0, y1, ...z }, ['px', 'py', 'ny', 'pz', 'nz']);
}

/** Grava a peça em `<out>/<key>.gltf` + `.bin`, com uma primitiva por camada. */
export async function writePiece(out, key, parts) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const mesh = doc.createMesh(key);
  let triangles = 0;
  for (const [name, { color, glow: lit, opacity, mesh: data }] of Object.entries(parts)) {
    if (data.positions.length === 0) continue;
    const glass = name === 'glass';
    const alpha = glass ? 0.45 : opacity;
    const material = doc
      .createMaterial(`MI_${name}`)
      .setBaseColorFactor([...linear(color), alpha])
      .setMetallicFactor(name === 'metal' ? 0.6 : 0)
      .setRoughnessFactor(glass ? 0.15 : 0.9);
    if (alpha < 1) material.setAlphaMode('BLEND');
    if (lit) material.setEmissiveFactor(linear(color));
    mesh.addPrimitive(
      doc
        .createPrimitive()
        .setMaterial(material)
        .setAttribute(
          'POSITION',
          doc
            .createAccessor()
            .setType('VEC3')
            .setArray(new Float32Array(data.positions))
            .setBuffer(buffer),
        )
        .setAttribute(
          'NORMAL',
          doc
            .createAccessor()
            .setType('VEC3')
            .setArray(new Float32Array(data.normals))
            .setBuffer(buffer),
        ),
    );
    triangles += data.positions.length / 9;
  }
  doc.createScene().addChild(doc.createNode(key).setMesh(mesh));
  await doc.transform(
    weld(),
    dedup({ propertyTypes: [PropertyType.ACCESSOR] }),
    prune(),
    quantize({ pattern: /^(POSITION|NORMAL)$/, quantizePosition: 16, quantizeNormal: 8 }),
    reorder({ encoder: MeshoptEncoder }),
  );
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  doc
    .getRoot()
    .listBuffers()
    .forEach((item) => item.setURI(`${key}.bin`));
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const { json, resources } = await io.writeJSON(doc, { basename: key });
  writeFileSync(join(out, `${key}.gltf`), JSON.stringify(json));
  for (const [name, bytes] of Object.entries(resources)) writeFileSync(join(out, name), bytes);
  console.log(key, 'triângulos', triangles);
}
