// Converte um veículo do pacote "Free Low Poly Vehicles" (Rgsdev, CC0) para o formato do site.
// O pacote vem em FBX: primeiro o Blender passa para .glb (scripts/assets/fbx-to-glb.py), depois
// este script põe na escala do mapa, centra, apoia no chão e comprime.
// Todos os veículos usam a mesma escala, então ônibus continua maior que sedã: o sedã fica com
// 3 casas de largura por 5 de comprimento, o tamanho que o usuário pediu para os carros.
// uso: node convert-vehicle.mjs <entrada.glb> <saída.gltf> [comprimento máximo em casas]
// O comprimento máximo encolhe só os veículos longos (bombeiros, limusine) para caberem no
// limite de peça do mapa (MAX_FOOTPRINT).
import { writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { NodeIO, PropertyType, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMaterialsSpecular } from '@gltf-transform/extensions';
import { dedup, flatten, join as joinMeshes, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const [INPUT, OUTPUT, MAX_LENGTH] = process.argv.slice(2);
const KEY = basename(OUTPUT, '.gltf');
/** Metro do pacote para casa do mapa: o sedã (5,2 m no pacote) vira 4,6 casas. */
const SCALE = 0.88;

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(INPUT);
// O brilho especular do Blender não muda nada no visual low-poly e só pesa no arquivo.
doc.getRoot().listExtensionsUsed().filter((ext) => ext instanceof KHRMaterialsSpecular).forEach((ext) => ext.dispose());

const scene = doc.getRoot().listScenes()[0];
const wrapper = doc.createNode(KEY).setScale([SCALE, SCALE, SCALE]);
for (const child of scene.listChildren()) {
  scene.removeChild(child);
  wrapper.addChild(child);
}
scene.addChild(wrapper);
const raw = getBounds(scene);
const length = raw.max[2] - raw.min[2];
if (MAX_LENGTH && length > Number(MAX_LENGTH)) {
  const fit = (SCALE * Number(MAX_LENGTH)) / length;
  wrapper.setScale([fit, fit, fit]);
}
const { min, max } = getBounds(scene);
// Origem no centro do footprint e base em y = 0, como as outras peças.
wrapper.setTranslation([-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2]);

await doc.transform(
  flatten(),
  joinMeshes(),
  weld(),
  dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MATERIAL] }),
  prune(),
  quantize({ quantizePosition: 14, quantizeNormal: 8 }),
  reorder({ encoder: MeshoptEncoder }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
doc.getRoot().listBuffers().forEach((buffer) => buffer.setURI(`${KEY}.bin`));
const { json, resources } = await io.writeJSON(doc, { basename: KEY });
writeFileSync(OUTPUT, JSON.stringify(json));
for (const [name, bytes] of Object.entries(resources)) writeFileSync(join(dirname(OUTPUT), name), bytes);

const bounds = getBounds(doc.getRoot().listScenes()[0]);
const size = bounds.max.map((value, axis) => value - bounds.min[axis]);
// Cor de longe: a do material que cobre mais triângulos (a lataria).
const areaByMaterial = new Map();
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const count = (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3;
    areaByMaterial.set(prim.getMaterial(), (areaByMaterial.get(prim.getMaterial()) ?? 0) + count);
  }
}
const body = [...areaByMaterial].sort((a, b) => b[1] - a[1])[0][0];
const hex = body
  .getBaseColorFactor()
  .slice(0, 3)
  .map((linear) => Math.round(255 * (linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055)))
  .map((value) => value.toString(16).padStart(2, '0'))
  .join('');
console.log(
  JSON.stringify({
    key: KEY,
    height: Number(size[1].toFixed(3)),
    footprint: { width: Math.ceil(size[0] - 0.05), depth: Math.ceil(size[2] - 0.05) },
    farColor: `#${hex}`,
  }),
);
