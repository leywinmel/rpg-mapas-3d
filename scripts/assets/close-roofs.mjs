// Fecha os telhados de duas águas do pacote medieval com o oitão de tijolo (Roof_Front_BrickN)
// nas duas pontas, e exporta no mesmo formato dos modelos já convertidos do rpgmaps:
// uma malha por material, posição Int16 normalizada (KHR_mesh_quantization), meshopt e
// texturas compartilhadas em textures/*.webp.
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, join as joinMeshes, mergeDocuments, prune, quantize, reorder, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const SRC = process.argv[2]; // pasta glTF bruta do kit
const OUT = process.argv[3]; // public/assets/medieval
const KIT_TO_CELL = 0.5; // 4 unidades do kit = 2 casas (o mesmo fator da conversão original)

/** chave do rpgmaps -> telhado bruto, oitão bruto e a meia-profundidade (em unidades do kit) onde fica a parede da ponta */
const ROOFS = [
  { key: 'med-telhado-2x2', roof: 'Roof_RoundTiles_4x4', gable: 'Roof_Front_Brick4', halfDepth: 2 },
  { key: 'med-telhado-2x4', roof: 'Roof_RoundTiles_4x8', gable: 'Roof_Front_Brick4', halfDepth: 4 },
  { key: 'med-telhado-4x4', roof: 'Roof_RoundTiles_8x8', gable: 'Roof_Front_Brick8', halfDepth: 4 },
];

const TEXTURE_BY_MATERIAL = {
  MI_WoodTrim: { image: 'T_WoodTrim_BaseColor', uri: 'textures/woodtrim.webp' },
  MI_RoundTiles: { image: 'T_RoundTiles_BaseColor', uri: 'textures/roundtiles.webp' },
  MI_Plaster: { image: 'T_Plaster_BaseColor', uri: 'textures/plaster.webp' },
};

/** Lê o glTF bruto sem as texturas (não precisamos dos PNG: as webp compartilhadas entram depois). */
async function readStripped(io, name) {
  const path = join(SRC, `${name}.gltf`);
  const json = JSON.parse(readFileSync(path, 'utf8'));
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
  return io.readJSON({ json, resources: { [`${name}.bin`]: readFileSync(join(SRC, `${name}.bin`)) } });
}

function boundsOf(scene) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  scene.traverse((node) => {
    const mesh = node.getMesh();
    if (!mesh) return;
    const matrix = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION');
      const v = [0, 0, 0];
      for (let i = 0; i < position.getCount(); i += 1) {
        position.getElement(i, v);
        const x = matrix[0] * v[0] + matrix[4] * v[1] + matrix[8] * v[2] + matrix[12];
        const y = matrix[1] * v[0] + matrix[5] * v[1] + matrix[9] * v[2] + matrix[13];
        const z = matrix[2] * v[0] + matrix[6] * v[1] + matrix[10] * v[2] + matrix[14];
        min[0] = Math.min(min[0], x); max[0] = Math.max(max[0], x);
        min[1] = Math.min(min[1], y); max[1] = Math.max(max[1], y);
        min[2] = Math.min(min[2], z); max[2] = Math.max(max[2], z);
      }
    }
  });
  return { min, max };
}

async function build(io, spec) {
  const roofDoc = await readStripped(io, spec.roof);
  const gableDoc = await readStripped(io, spec.gable);
  // Junta os dois documentos: o oitão vira uma segunda cena, que esvaziamos para dentro da primeira.
  mergeDocuments(roofDoc, gableDoc);
  const doc = roofDoc;
  const [scene, gableScene] = doc.getRoot().listScenes();
  const gableNodes = gableScene.listChildren();
  // Raiz com o ajuste da conversão original: 1 unidade do kit = 0,5 casa; base no chão; centro em x/z.
  const root = doc.createNode('fit');
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    root.addChild(child);
  }
  const rawRoof = boundsOf(scene.addChild(root));
  const roofMinY = rawRoof.min[1];
  for (const gableNode of gableNodes) {
    gableScene.removeChild(gableNode);
    // Ponta +z: o oitão olha para fora; ponta -z: girado meia-volta.
    const front = gableNode;
    front.setTranslation([0, 0, spec.halfDepth]);
    root.addChild(front);
    const back = doc.createNode('gable-back').setMesh(front.getMesh());
    back.setRotation([0, 1, 0, 0]);
    back.setTranslation([0, 0, -spec.halfDepth]);
    root.addChild(back);
  }
  gableScene.dispose();
  const raw = boundsOf(scene);
  const centerX = (raw.min[0] + raw.max[0]) / 2;
  const centerZ = (raw.min[2] + raw.max[2]) / 2;
  root.setScale([KIT_TO_CELL, KIT_TO_CELL, KIT_TO_CELL]);
  root.setTranslation([-centerX * KIT_TO_CELL, -roofMinY * KIT_TO_CELL, -centerZ * KIT_TO_CELL]);

  await doc.transform(
    unpartition(),
    // Só acessores: sem as texturas, os materiais ficariam "iguais" e o dedup fundiria telha com madeira.
    dedup({ propertyTypes: [PropertyType.ACCESSOR] }),
    joinMeshes({ keepNamed: false, keepMeshes: false }),
    prune(),
    quantize({ pattern: /^(POSITION|NORMAL)$/, quantizePosition: 16, quantizeNormal: 8 }),
    reorder({ encoder: MeshoptEncoder }),
  );
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  const [node] = doc.getRoot().listScenes()[0].listChildren();
  node.setName(spec.roof);
  doc.getRoot().listBuffers().forEach((buffer) => buffer.setURI(`${spec.key}.bin`));

  const { json, resources } = await io.writeJSON(doc, { basename: spec.key });
  // Texturas: as webp compartilhadas, como nos modelos já convertidos.
  const materials = json.materials ?? [];
  json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  json.images = [];
  json.textures = [];
  for (const material of materials) {
    const texture = TEXTURE_BY_MATERIAL[material.name];
    if (!texture) throw new Error(`material sem textura conhecida: ${material.name}`);
    const index = json.images.length;
    json.images.push({ name: texture.image, mimeType: 'image/webp', uri: texture.uri });
    json.textures.push({ sampler: 0, extensions: { EXT_texture_webp: { source: index } } });
    material.doubleSided = true;
    material.pbrMetallicRoughness = { metallicFactor: 0, baseColorTexture: { index } };
    delete material.extensions;
  }
  json.extensionsUsed = ['EXT_meshopt_compression', 'EXT_texture_webp', 'KHR_mesh_quantization'];
  json.extensionsRequired = [...json.extensionsUsed];
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${spec.key}.gltf`), JSON.stringify(json));
  for (const [name, bytes] of Object.entries(resources)) writeFileSync(join(OUT, name), bytes);
  const size = [0, 1, 2].map((i) => +((raw.max[i] - raw.min[i]) * KIT_TO_CELL).toFixed(3));
  console.log(spec.key, 'tamanho', size, 'materiais', materials.map((m) => m.name).join(','), 'arquivos', Object.keys(resources).join(','));
}

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
for (const spec of ROOFS) await build(io, spec);
