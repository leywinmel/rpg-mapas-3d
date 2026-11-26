// Converte as peças de um pacote KayKit (Kay Lousberg, CC0; lista em kaykit-packs.mjs) para o
// formato do site: põe na escala do boneco, centra no footprint, apoia no chão, comprime a malha e
// troca a textura embutida (a mesma paleta em todos os modelos) por uma WebP compartilhada.
// Imprime, para cada peça, a altura, o footprint e a cor de longe (média da paleta sob a malha),
// prontos para o catálogo.
// A imagem passa pelo sharp em outro processo (texture-webp.mjs e um leitor de pixels): o
// gltf-transform carrega outro libvips e os dois no mesmo processo quebram.
// uso: node scripts/assets/kaykit-props.mjs <pacote> <pasta gltf do pacote> <public/assets/...>
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeIO, PropertyType, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, flatten, join as joinMeshes, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { KAYKIT_PACKS } from './kaykit-packs.mjs';

const [PACK, INPUT, OUT] = process.argv.slice(2);
const pack = KAYKIT_PACKS[PACK];
if (!pack || !INPUT || !OUT) {
  throw new Error(`uso: node scripts/assets/kaykit-props.mjs <${Object.keys(KAYKIT_PACKS).join('|')}> <pasta gltf> <saída>`);
}
/**
 * A paleta do pacote fica ao lado da pasta gltf, em texture/ ou textures/ conforme o pacote; no
 * Medieval Hexagon ela vem dentro da própria pasta dos modelos.
 */
function findPalette() {
  for (const folder of ['../texture', '../textures', '.']) {
    const dir = join(INPUT, folder);
    if (!existsSync(dir)) continue;
    const png = readdirSync(dir).find((name) => name.endsWith('.png'));
    if (png) return join(dir, png);
  }
  throw new Error('paleta .png do pacote não encontrada');
}
const PALETTE_PNG = findPalette();

const SCALE = pack.scale;
/** Quanto a peça pode passar da borda do footprint sem ganhar mais uma casa. */
const OVERHANG = 0.3;
/** Folga do arredondamento: 1,3 − 0,3 não pode virar 2 casas por um erro na última casa decimal. */
const EPSILON = 1e-3;
/** A paleta do pacote é de cores chapadas: 256 px bastam e o arquivo fica pequeno. */
const TEXTURE_SIZE = 256;
const TEXTURE_URI = `textures/${pack.texture}.webp`;

/** Modelo do pacote e chave da peça; a frente de cada peça olha para +z. */
const PIECES = pack.pieces;

mkdirSync(join(OUT, 'textures'), { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

let palette = null;

/** Cor média da paleta nos UVs da malha: o que a peça parece de longe. */
async function farColor(doc) {
  const sum = [0, 0, 0];
  let count = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const uv = prim.getAttribute('TEXCOORD_0');
      if (!uv) continue;
      for (let i = 0; i < uv.getCount(); i += 1) {
        const [u, v] = uv.getElement(i, []);
        const x = Math.min(palette.width - 1, Math.max(0, Math.floor(u * palette.width)));
        const y = Math.min(palette.height - 1, Math.max(0, Math.floor(v * palette.height)));
        const at = (y * palette.width + x) * palette.channels;
        for (let c = 0; c < 3; c += 1) sum[c] += palette.data[at + c];
        count += 1;
      }
    }
  }
  return `#${sum.map((value) => Math.round(value / Math.max(count, 1)).toString(16).padStart(2, '0')).join('')}`;
}

/** Lê os pixels da paleta (RGB cru) num processo à parte e grava a WebP do site. */
function loadPalette() {
  const raw = join(tmpdir(), 'kaykit-palette.json');
  const reader = `import sharp from 'sharp'; import { writeFileSync } from 'node:fs';
const { data, info } = await sharp(process.argv[1]).removeAlpha().raw().toBuffer({ resolveWithObject: true });
writeFileSync(process.argv[2], JSON.stringify({ width: info.width, height: info.height, channels: info.channels, data: data.toString('base64') }));`;
  execFileSync(process.execPath, ['--input-type=module', '-e', reader, PALETTE_PNG, raw]);
  execFileSync(process.execPath, [join(import.meta.dirname, 'texture-webp.mjs'), PALETTE_PNG, join(OUT, TEXTURE_URI), String(TEXTURE_SIZE)]);
  const parsed = JSON.parse(readFileSync(raw, 'utf8'));
  return { ...parsed, data: Buffer.from(parsed.data, 'base64') };
}

palette = loadPalette();
const entries = [];
for (const [model, key] of PIECES) {
  // Cada pacote exporta de um jeito: .gltf com .bin, .gltf.glb ou .glb.
  const path = ['.gltf', '.gltf.glb', '.glb'].map((ext) => join(INPUT, model + ext)).find(existsSync);
  if (!path) throw new Error(`modelo ${model} não encontrado`);
  const doc = await io.read(path);
  const root = doc.getRoot();
  // A imagem não vai dentro do arquivo: todos apontam para a mesma WebP.
  for (const each of root.listTextures()) {
    each.setImage(new Uint8Array(0)).setMimeType('image/webp').setURI(TEXTURE_URI);
  }
  doc.createExtension(EXTTextureWebP).setRequired(true);

  const far = await farColor(doc);
  const scene = root.listScenes()[0];
  const wrapper = doc.createNode(key).setScale([SCALE, SCALE, SCALE]);
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    wrapper.addChild(child);
  }
  scene.addChild(wrapper);
  const { min, max } = getBounds(scene);
  wrapper.setTranslation([-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2]);

  await doc.transform(
    flatten(),
    joinMeshes(),
    weld(),
    dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MATERIAL] }),
    prune({ keepLeaves: false }),
    quantize({ quantizePosition: 14, quantizeNormal: 8 }),
    reorder({ encoder: MeshoptEncoder }),
  );
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  root.listBuffers().forEach((buffer) => buffer.setURI(`${key}.bin`));
  const { json, resources } = await io.writeJSON(doc, { basename: key });
  writeFileSync(join(OUT, `${key}.gltf`), JSON.stringify(json));
  for (const [name, bytes] of Object.entries(resources)) {
    if (name.endsWith('.bin')) writeFileSync(join(OUT, name), bytes);
  }

  const bounds = getBounds(root.listScenes()[0]);
  const size = bounds.max.map((value, axis) => value - bounds.min[axis]);
  entries.push({
    key,
    height: Number(size[1].toFixed(3)),
    size: size.map((value) => Number(value.toFixed(2))),
    footprint: {
      width: Math.max(1, Math.ceil(size[0] - OVERHANG - EPSILON)),
      depth: Math.max(1, Math.ceil(size[2] - OVERHANG - EPSILON)),
    },
    farColor: far,
  });
}
console.log(JSON.stringify(entries, null, 1));
