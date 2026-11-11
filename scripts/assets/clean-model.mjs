// Limpa um modelo .glb gerado por IA de imagem-para-3D antes de virar token: tira as ilhas
// soltas (pedacinhos flutuando em volta) e o "chão" que às vezes vem colado nos pés, e
// comprime (textura em webp, geometria quantizada e meshopt). O app já lê meshopt nos modelos
// enviados. Não mexe na pose nem no tamanho: o encaixe no token continua sendo do app.
// uso: node scripts/assets/clean-model.mjs <entrada.glb> <saida.glb> [--dry]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const [SOURCE, TARGET, ...flags] = process.argv.slice(2);
const DRY = flags.includes('--dry');
const TEXTURE_SIZE = 1024;
/** Ilha com menos triângulos que esta fração da maior é sujeira da geração. */
const MIN_ISLAND = 0.01;
/**
 * "Chão": peça achatada (mais baixa que esta fração da própria largura), encostada embaixo
 * (até BOTTOM da altura do modelo) e larga (mais que WIDE da largura do modelo).
 */
const FLAT = 0.2;
const BOTTOM = 0.04;
const WIDE = 0.5;
/** Pontos mais perto que isto (fração do maior lado) contam como o mesmo ao ligar triângulos. */
const SAME_POINT = 1e-5;

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.readBinary(readFileSync(SOURCE));
const root = doc.getRoot();

function find(parent, index) {
  while (parent[index] !== index) {
    parent[index] = parent[parent[index]];
    index = parent[index];
  }
  return index;
}

/** Junta os triângulos que se tocam e devolve, para cada um, o número do grupo dele. */
function islands(positions, indices, size) {
  const step = size * SAME_POINT;
  const ids = new Map();
  const pointId = new Int32Array(positions.length / 3);
  for (let v = 0; v < pointId.length; v++) {
    const key = `${Math.round(positions[v * 3] / step)},${Math.round(positions[v * 3 + 1] / step)},${Math.round(positions[v * 3 + 2] / step)}`;
    if (!ids.has(key)) ids.set(key, ids.size);
    pointId[v] = ids.get(key);
  }
  const parent = Int32Array.from({ length: ids.size }, (_, i) => i);
  for (let t = 0; t < indices.length; t += 3) {
    const a = find(parent, pointId[indices[t]]);
    const b = find(parent, pointId[indices[t + 1]]);
    const c = find(parent, pointId[indices[t + 2]]);
    parent[b] = a;
    parent[find(parent, c)] = a;
  }
  const group = new Int32Array(indices.length / 3);
  for (let t = 0; t < group.length; t++) group[t] = find(parent, pointId[indices[t * 3]]);
  return group;
}

function cleanPrimitive(prim) {
  const position = prim.getAttribute('POSITION');
  const positions = position.getArray();
  const indices = prim.getIndices()?.getArray();
  if (!indices) return;
  const min = position.getMin([]);
  const max = position.getMax([]);
  const extent = [0, 1, 2].map((axis) => max[axis] - min[axis]);
  const height = extent[1];
  const width = Math.max(extent[0], extent[2]);
  const group = islands(positions, indices, Math.max(...extent));

  const stats = new Map();
  for (let t = 0; t < group.length; t++) {
    let item = stats.get(group[t]);
    if (!item) {
      item = { tris: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      stats.set(group[t], item);
    }
    item.tris++;
    for (let k = 0; k < 3; k++) {
      const v = indices[t * 3 + k];
      for (let axis = 0; axis < 3; axis++) {
        item.min[axis] = Math.min(item.min[axis], positions[v * 3 + axis]);
        item.max[axis] = Math.max(item.max[axis], positions[v * 3 + axis]);
      }
    }
  }
  const largest = Math.max(...[...stats.values()].map((item) => item.tris));
  const drop = new Set();
  for (const [id, item] of stats) {
    const itemWidth = Math.max(item.max[0] - item.min[0], item.max[2] - item.min[2]);
    const flat = item.max[1] - item.min[1] < itemWidth * FLAT;
    const atBottom = item.min[1] - min[1] < height * BOTTOM;
    const wide = itemWidth > width * WIDE;
    if (item.tris < largest * MIN_ISLAND) drop.add(id);
    else if (flat && atBottom && wide) drop.add(id);
  }
  if (DRY) {
    for (const item of stats.values()) {
      const size = [0, 1, 2].map((axis) => ((item.max[axis] - item.min[axis]) / height).toFixed(2));
      const floor = ((item.min[1] - min[1]) / height).toFixed(2);
      console.log(`    ${item.tris} tri, tamanho ${size.join('x')} (da altura), começa em ${floor}`);
    }
  }
  const groundDropped = [...drop].filter((id) => stats.get(id).tris >= largest * MIN_ISLAND).length;
  const droppedTris = [...drop].reduce((sum, id) => sum + stats.get(id).tris, 0);
  console.log(
    `  ${stats.size} ilhas, maior ${largest} tri; tira ${drop.size} (${droppedTris} tri, ${groundDropped} chão) de ${group.length}`,
  );
  if (DRY || drop.size === 0) return;
  const kept = [];
  for (let t = 0; t < group.length; t++) {
    if (drop.has(group[t])) continue;
    kept.push(indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]);
  }
  const Typed = indices.constructor;
  prim.getIndices().setArray(new Typed(kept));
  compactPrimitive(prim);
}

console.log(SOURCE);
await doc.transform(weld());
for (const mesh of root.listMeshes()) mesh.listPrimitives().forEach(cleanPrimitive);
if (DRY) process.exit(0);

// Texturas em webp num processo à parte (ver texture-webp.mjs).
const webpScript = join(dirname(fileURLToPath(import.meta.url)), 'texture-webp.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'rpgmaps-clean-'));
doc.createExtension(EXTTextureWebP).setRequired(true);
root.listTextures().forEach((texture, index) => {
  const input = join(scratch, `${index}.png`);
  const output = join(scratch, `${index}.webp`);
  writeFileSync(input, texture.getImage());
  execFileSync(process.execPath, [webpScript, input, output, String(TEXTURE_SIZE)], { stdio: 'inherit' });
  texture.setImage(readFileSync(output)).setMimeType('image/webp');
});
rmSync(scratch, { recursive: true, force: true });

await doc.transform(
  prune(),
  dedup(),
  quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }),
  reorder({ encoder: MeshoptEncoder }),
);
doc
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
writeFileSync(TARGET, await io.writeBinary(doc));
console.log(`  ${(readFileSync(SOURCE).length / 1024).toFixed(0)} KB -> ${(readFileSync(TARGET).length / 1024).toFixed(0)} KB`);
