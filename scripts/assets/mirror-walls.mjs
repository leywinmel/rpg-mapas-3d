// Deixa uma parede de pacote igual dos dois lados, ou estica uma peça no comprimento.
// A parede no mapa não tem frente nem verso (só a aresta), então uma parede com tijolo de um
// lado e reboco do outro mostra o lado de dentro para a rua em metade da casa. Aqui o lado de
// fora vira espelho do lado de dentro: o modelo fica igual dos dois lados.
//
// Modos:
//   front  corta a parede no meio (z = 0), fica com a metade de z >= 0 e a espelha
//   back   igual, com a metade de z <= 0
//   dup    o modelo só tem faces de um lado (painéis sci-fi): copia tudo espelhado
//   stretch:<fator>  estica em z (escada que precisa ir de uma ponta à outra das casas)
//
// uso: node mirror-walls.mjs <modo> <entrada.gltf> <saída.gltf>
// A saída reaproveita materiais e texturas da entrada (mesmos arquivos em textures/).
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const [MODE, INPUT, OUTPUT] = process.argv.slice(2);
const KEY = basename(OUTPUT, '.gltf');
/** Folga do corte: vértice a menos disto do meio conta como "no meio". */
const EPSILON = 1e-5;

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const original = JSON.parse(readFileSync(INPUT, 'utf8'));
const stripped = JSON.parse(JSON.stringify(original));
for (const material of stripped.materials ?? []) {
  delete material.normalTexture;
  delete material.occlusionTexture;
  delete material.emissiveTexture;
  if (material.pbrMetallicRoughness) {
    delete material.pbrMetallicRoughness.baseColorTexture;
    delete material.pbrMetallicRoughness.metallicRoughnessTexture;
  }
}
delete stripped.images;
delete stripped.textures;
delete stripped.samplers;
const resources = {};
for (const buffer of stripped.buffers ?? []) if (buffer.uri) resources[buffer.uri] = readFileSync(join(dirname(INPUT), buffer.uri));
const doc = await io.readJSON({ json: stripped, resources });

/** Triângulos soltos de um material, já no espaço do mundo: cada vértice é { nome: [valores] }. */
const groups = new Map();
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const m = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const material = prim.getMaterial();
    const group = groups.get(material) ?? { semantics: prim.listSemantics().filter((s) => s !== 'TANGENT'), tris: [] };
    groups.set(material, group);
    const indices = prim.getIndices();
    const count = indices ? indices.getCount() : prim.getAttribute('POSITION').getCount();
    const vertex = (i) => {
      const out = {};
      for (const semantic of group.semantics) out[semantic] = prim.getAttribute(semantic).getElement(i, []);
      const [x, y, z] = out.POSITION;
      out.POSITION = [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
      if (out.NORMAL) {
        const [a, b, c] = out.NORMAL;
        const n = [m[0] * a + m[4] * b + m[8] * c, m[1] * a + m[5] * b + m[9] * c, m[2] * a + m[6] * b + m[10] * c];
        const length = Math.hypot(...n) || 1;
        out.NORMAL = n.map((value) => value / length);
      }
      return out;
    };
    for (let t = 0; t < count; t += 3) {
      group.tris.push([0, 1, 2].map((k) => vertex(indices ? indices.getScalar(t + k) : t + k)));
    }
  }
}

function lerp(a, b, t) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = a[key].map((value, i) => value + (b[key][i] - value) * t);
  if (out.NORMAL) {
    const length = Math.hypot(...out.NORMAL) || 1;
    out.NORMAL = out.NORMAL.map((value) => value / length);
  }
  return out;
}

/** Recorta o triângulo no plano z = 0, ficando com o lado sign * z >= 0 (Sutherland-Hodgman). */
function clip(tri, sign) {
  const side = (v) => sign * v.POSITION[2] >= -EPSILON;
  const polygon = [];
  for (let i = 0; i < 3; i += 1) {
    const a = tri[i];
    const b = tri[(i + 1) % 3];
    if (side(a)) polygon.push(a);
    if (side(a) !== side(b)) {
      const t = a.POSITION[2] / (a.POSITION[2] - b.POSITION[2]);
      polygon.push(lerp(a, b, t));
    }
  }
  const out = [];
  for (let i = 1; i + 1 < polygon.length; i += 1) out.push([polygon[0], polygon[i], polygon[i + 1]]);
  return out;
}

/** Espelha em z: posição e normal trocam de sinal e a ordem do triângulo vira para a face continuar para fora. */
function mirror(tri) {
  const flip = (v) => ({
    ...v,
    POSITION: [v.POSITION[0], v.POSITION[1], -v.POSITION[2]],
    ...(v.NORMAL ? { NORMAL: [v.NORMAL[0], v.NORMAL[1], -v.NORMAL[2]] } : {}),
  });
  return [flip(tri[0]), flip(tri[2]), flip(tri[1])];
}

function stretch(tri, factor) {
  return tri.map((v) => {
    const out = { ...v, POSITION: [v.POSITION[0], v.POSITION[1], v.POSITION[2] * factor] };
    if (v.NORMAL) {
      // Normal sob escala não uniforme: divide pelo fator e renormaliza.
      const n = [v.NORMAL[0], v.NORMAL[1], v.NORMAL[2] / factor];
      const length = Math.hypot(...n) || 1;
      out.NORMAL = n.map((value) => value / length);
    }
    return out;
  });
}

/**
 * Vidro e "interior falso" ficam atrás do meio da parede (dentro da janela): cortados, a
 * janela viraria um buraco. Eles são copiados inteiros e espelhados, como no modo dup.
 */
const UNCUT_MATERIAL = /Glass|FakeInterior/;

function transform(tris, materialName = '') {
  if ((MODE === 'front' || MODE === 'back') && UNCUT_MATERIAL.test(materialName)) {
    return [...tris, ...tris.map(mirror)];
  }
  if (MODE === 'front' || MODE === 'back') {
    const kept = tris.flatMap((tri) => clip(tri, MODE === 'front' ? 1 : -1));
    return [...kept, ...kept.map(mirror)];
  }
  if (MODE === 'dup') return [...tris, ...tris.map(mirror)];
  if (MODE.startsWith('stretch:')) return tris.map((tri) => stretch(tri, Number(MODE.split(':')[1])));
  throw new Error(`modo desconhecido: ${MODE}`);
}

const ELEMENT_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const buffer = doc.getRoot().listBuffers()[0];
const out = doc.createMesh(KEY);
for (const [material, group] of groups) {
  const tris = transform(group.tris, material?.getName());
  if (tris.length === 0) continue;
  const prim = doc.createPrimitive().setMaterial(material);
  for (const semantic of group.semantics) {
    const width = tris[0][0][semantic].length;
    const array = new Float32Array(tris.length * 3 * width);
    let offset = 0;
    for (const tri of tris) for (const v of tri) for (const value of v[semantic]) array[offset++] = value;
    const type = Object.keys(ELEMENT_SIZE).find((name) => ELEMENT_SIZE[name] === width);
    prim.setAttribute(semantic, doc.createAccessor().setType(type).setArray(array).setBuffer(buffer));
  }
  out.addPrimitive(prim);
}
const scene = doc.getRoot().listScenes()[0];
for (const child of scene.listChildren()) child.dispose();
for (const node of doc.getRoot().listNodes()) node.dispose();
for (const mesh of doc.getRoot().listMeshes()) if (mesh !== out) mesh.dispose();
scene.addChild(doc.createNode(KEY).setMesh(out));

await doc.transform(
  weld(),
  dedup({ propertyTypes: [PropertyType.ACCESSOR] }),
  // Sem as texturas carregadas, o prune acharia as UVs inúteis e as apagaria.
  prune({ keepAttributes: true }),
  quantize({ pattern: /^(POSITION|NORMAL)$/, quantizePosition: 16, quantizeNormal: 8 }),
  reorder({ encoder: MeshoptEncoder }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
doc.getRoot().listBuffers().forEach((b) => b.setURI(`${KEY}.bin`));

const { json, resources: written } = await io.writeJSON(doc, { basename: KEY });
// Materiais, imagens e texturas voltam como estavam no original (por nome do material).
const byName = new Map((original.materials ?? []).map((material) => [material.name, material]));
json.samplers = original.samplers;
json.images = original.images;
json.textures = original.textures;
json.materials = json.materials.map((material) => {
  const copy = JSON.parse(JSON.stringify(byName.get(material.name)));
  // Agora a parede tem faces dos dois lados: frente e verso desenhados juntos brigariam.
  if (!MODE.startsWith('stretch:')) delete copy.doubleSided;
  return copy;
});
for (const key of ['samplers', 'images', 'textures']) if (!json[key]) delete json[key];
json.extensionsUsed = original.extensionsUsed;
json.extensionsRequired = original.extensionsRequired;
writeFileSync(OUTPUT, JSON.stringify(json));
for (const [name, bytes] of Object.entries(written)) writeFileSync(join(dirname(OUTPUT), name), bytes);
const total = [...groups].reduce((sum, [material, group]) => sum + transform(group.tris, material?.getName()).length, 0);
console.log(KEY, MODE, 'triângulos', total);
