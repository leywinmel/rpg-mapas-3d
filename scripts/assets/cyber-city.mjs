// Monta os prédios do estilo cyberpunk (RPG-42) a partir do pacote "Cyber City" (papptimus,
// CC BY 4.0): os dois prédios inteiros do pacote e dois megaprédios empilhando as seções
// (térreo, andares do meio, topo e laje). O pacote vem em FBX: o Blender passa cada peça para
// .glb antes (o mesmo caminho do scripts/assets/fbx-to-glb.py), e este script põe na escala
// do mapa, centra, apoia no chão, acende o neon e comprime.
// Escala: cada seção do pacote vira um andar do mapa (2 casas de altura); com isso o prédio
// fica com 6 × 6 casas de chão.
// uso: node scripts/assets/cyber-city.mjs <pasta dos .glb do pacote> <public/assets/cyberpunk>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO, PropertyType, getBounds } from '@gltf-transform/core';
import {
  ALL_EXTENSIONS,
  EXTMeshoptCompression,
  EXTTextureWebP,
  KHRMaterialsSpecular,
} from '@gltf-transform/extensions';
import {
  dedup,
  flatten,
  mergeDocuments,
  prune,
  quantize,
  reorder,
  unpartition,
  weld,
} from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const [SOURCE, OUT] = process.argv.slice(2);
if (!SOURCE || !OUT) {
  throw new Error(
    'uso: node scripts/assets/cyber-city.mjs <pasta dos .glb> <public/assets/cyberpunk>',
  );
}

/** Altura de uma seção do pacote (unidades dele) e de um andar do mapa (casas). */
const SECTION_HEIGHT = 14.96;
const STORY = 2;
const SCALE = STORY / SECTION_HEIGHT;
/** A textura do pacote é pequena (pixel art de janela): passar disso só pesaria. */
const TEXTURE_SIZE = 256;

/** Cada prédio: as peças do pacote de baixo para cima (a laje fecha o topo). */
const BUILDINGS = [
  { key: 'cyb-predio-baixo', parts: ['cyb-2-story'] },
  { key: 'cyb-predio-medio', parts: ['cyb-4-story'] },
  {
    key: 'cyb-megapredio',
    parts: [
      'cyb-btm-1',
      'cyb-mid-1',
      'cyb-mid-2',
      'cyb-mid-1',
      'cyb-mid-3',
      'cyb-mid-2',
      'cyb-top-1',
      'cyb-roof-sqr',
    ],
  },
  {
    key: 'cyb-megapredio-neon',
    parts: [
      'cyb-btm-3',
      'cyb-mid-4',
      'cyb-mid-4',
      'cyb-mid-3',
      'cyb-mid-4',
      'cyb-mid-4',
      'cyb-mid-3',
      'cyb-mid-4',
      'cyb-top-3',
      'cyb-roof-sqr',
    ],
  },
];

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

/** Empilha as peças: cada uma começa onde a anterior terminou. */
async function assemble({ key, parts }) {
  const doc = await io.read(join(SOURCE, `${parts[0]}.glb`));
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  const wrapper = doc.createNode(key);
  let top = 0;
  for (const [index, part] of parts.entries()) {
    let source = scene;
    if (index > 0) {
      const map = mergeDocuments(doc, await io.read(join(SOURCE, `${part}.glb`)));
      source = [...map.values()].find((property) => property.propertyType === PropertyType.SCENE);
    }
    const section = doc.createNode(part);
    for (const child of source.listChildren()) {
      source.removeChild(child);
      section.addChild(child);
    }
    if (source !== scene) source.dispose();
    const { min, max } = getBounds(section);
    section.setTranslation([0, top - min[1], 0]);
    top += max[1] - min[1];
    wrapper.addChild(section);
  }
  scene.addChild(wrapper);
  wrapper.setScale([SCALE, SCALE, SCALE]);
  const { min, max } = getBounds(scene);
  // Origem no centro do footprint e base em y = 0, como as outras peças.
  wrapper.setTranslation([-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2]);
  return doc;
}

/** O pacote liga a textura de brilho com fator zero: sem fator, o neon fica apagado. */
function lightNeon(doc) {
  for (const material of doc.getRoot().listMaterials()) {
    if (material.getEmissiveTexture()) material.setEmissiveFactor([1, 1, 1]);
    material.setMetallicFactor(0);
  }
}

/** Texturas em webp num processo à parte (ver texture-webp.mjs). */
function texturesToWebp(doc) {
  const webpScript = join(dirname(fileURLToPath(import.meta.url)), 'texture-webp.mjs');
  const scratch = mkdtempSync(join(tmpdir(), 'rpgmaps-cyber-'));
  doc.createExtension(EXTTextureWebP).setRequired(true);
  doc
    .getRoot()
    .listTextures()
    .forEach((texture, index) => {
      const input = join(scratch, `${index}.png`);
      const output = join(scratch, `${index}.webp`);
      writeFileSync(input, texture.getImage());
      execFileSync(process.execPath, [webpScript, input, output, String(TEXTURE_SIZE)], {
        stdio: 'inherit',
      });
      texture.setImage(readFileSync(output)).setMimeType('image/webp').setURI('');
    });
  rmSync(scratch, { recursive: true, force: true });
}

for (const building of BUILDINGS) {
  const doc = await assemble(building);
  const { key } = building;
  doc
    .getRoot()
    .listExtensionsUsed()
    .filter((ext) => ext instanceof KHRMaterialsSpecular)
    .forEach((ext) => ext.dispose());
  lightNeon(doc);
  await doc.transform(
    flatten(),
    weld(),
    dedup(),
    prune(),
    quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }),
    reorder({ encoder: MeshoptEncoder }),
    unpartition(),
  );
  texturesToWebp(doc);
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  doc
    .getRoot()
    .listBuffers()
    .forEach((buffer) => buffer.setURI(`${key}.bin`));
  doc
    .getRoot()
    .listTextures()
    .forEach((texture, index) => texture.setURI(`${key}-${index}.webp`));
  const { json, resources } = await io.writeJSON(doc, { basename: key });
  writeFileSync(join(OUT, `${key}.gltf`), JSON.stringify(json));
  for (const [name, bytes] of Object.entries(resources)) writeFileSync(join(OUT, name), bytes);
  const { min, max } = getBounds(doc.getRoot().listScenes()[0]);
  const size = max.map((value, axis) => value - min[axis]);
  console.log(
    JSON.stringify({
      key,
      height: Number(size[1].toFixed(3)),
      footprint: { width: Math.round(size[0]), depth: Math.round(size[2]) },
    }),
  );
}
