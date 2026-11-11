// Converte uma parede bruta do kit Downtown para o formato dos modelos do rpgmaps, com o mesmo
// encaixe das paredes já convertidas (1 casa de largura, 2 de altura) e os materiais copiados
// dos arquivos já publicados (texturas compartilhadas em textures/*.webp).
// uso: node convert-wall.mjs <pasta glTF bruta> <modelo> <chave de saída> <public/assets/modern> <doador1.gltf> [doador2.gltf...]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, join as joinMeshes, prune, quantize, reorder, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const [SRC, MODEL, KEY, OUT, ...DONORS] = process.argv.slice(2);
// Kit: parede de 2 unidades de largura por 3 de altura; no rpgmaps ela ocupa 1 casa por 2 de altura.
const FIT = [0.5, 2 / 3, 0.5];

function stripTextures(json) {
  for (const material of json.materials ?? []) {
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
  }
  delete json.images;
  delete json.textures;
  delete json.samplers;
  return json;
}

/** Materiais e imagens dos arquivos já convertidos, por nome de material. */
function donorMaterials() {
  const byName = new Map();
  for (const path of DONORS) {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    for (const material of json.materials ?? []) {
      if (byName.has(material.name)) continue;
      const textureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index;
      const image = textureIndex === undefined ? null : json.images[json.textures[textureIndex].extensions.EXT_texture_webp.source];
      byName.set(material.name, { material, image });
    }
  }
  return byName;
}

function boundsOf(scene) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  scene.traverse((node) => {
    const mesh = node.getMesh();
    if (!mesh) return;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION');
      const v = [0, 0, 0];
      for (let i = 0; i < position.getCount(); i += 1) {
        position.getElement(i, v);
        const x = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12];
        const y = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13];
        const z = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14];
        min[0] = Math.min(min[0], x); max[0] = Math.max(max[0], x);
        min[1] = Math.min(min[1], y); max[1] = Math.max(max[1], y);
        min[2] = Math.min(min[2], z); max[2] = Math.max(max[2], z);
      }
    }
  });
  return { min, max };
}

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const json = stripTextures(JSON.parse(readFileSync(join(SRC, `${MODEL}.gltf`), 'utf8')));
const doc = await io.readJSON({ json, resources: { [`${MODEL}.bin`]: readFileSync(join(SRC, `${MODEL}.bin`)) } });
const scene = doc.getRoot().listScenes()[0];
const root = doc.createNode('fit');
for (const child of scene.listChildren()) {
  scene.removeChild(child);
  root.addChild(child);
}
scene.addChild(root);
const raw = boundsOf(scene);
root.setScale(FIT);
// Centro em x, base no chão, z como no kit (a face externa da parede fica em z = 0).
root.setTranslation([-((raw.min[0] + raw.max[0]) / 2) * FIT[0], -raw.min[1] * FIT[1], -((raw.min[2] + raw.max[2]) / 2) * FIT[2]]);

await doc.transform(
  unpartition(),
  dedup({ propertyTypes: [PropertyType.ACCESSOR] }),
  joinMeshes({ keepNamed: false, keepMeshes: false }),
  prune(),
  quantize({ pattern: /^(POSITION|NORMAL)$/, quantizePosition: 16, quantizeNormal: 8 }),
  reorder({ encoder: MeshoptEncoder }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
doc.getRoot().listScenes()[0].listChildren()[0].setName(MODEL);
doc.getRoot().listBuffers().forEach((buffer) => buffer.setURI(`${KEY}.bin`));

const { json: out, resources } = await io.writeJSON(doc, { basename: KEY });
const donors = donorMaterials();
out.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
out.images = [];
out.textures = [];
out.materials = out.materials.map((material) => {
  const donor = donors.get(material.name);
  if (!donor) throw new Error(`material sem doador: ${material.name}`);
  const copy = JSON.parse(JSON.stringify(donor.material));
  if (donor.image) {
    const index = out.images.length;
    out.images.push({ ...donor.image });
    out.textures.push({ sampler: 0, extensions: { EXT_texture_webp: { source: index } } });
    copy.pbrMetallicRoughness.baseColorTexture = { index };
  }
  return copy;
});
out.extensionsUsed = ['EXT_meshopt_compression', 'EXT_texture_webp', 'KHR_mesh_quantization'];
out.extensionsRequired = [...out.extensionsUsed];
writeFileSync(join(OUT, `${KEY}.gltf`), JSON.stringify(out));
for (const [name, bytes] of Object.entries(resources)) writeFileSync(join(OUT, name), bytes);
const size = [0, 1, 2].map((i) => +((raw.max[i] - raw.min[i]) * FIT[i]).toFixed(3));
console.log(KEY, 'tamanho', size, 'materiais', out.materials.map((m) => m.name).join(','));
