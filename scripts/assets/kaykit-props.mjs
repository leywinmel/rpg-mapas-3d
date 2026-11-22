// Converte os móveis e adereços do pacote "KayKit Dungeon Remastered" (Kay Lousberg, CC0) para o
// formato do site: põe na escala do boneco, centra no footprint, apoia no chão, comprime a malha e
// troca a textura embutida (a mesma paleta em todos os modelos) por uma WebP compartilhada.
// Imprime, para cada peça, a altura, o footprint e a cor de longe (média da paleta sob a malha),
// prontos para o catálogo.
// A imagem passa pelo sharp em outro processo (texture-webp.mjs e um leitor de pixels): o
// gltf-transform carrega outro libvips e os dois no mesmo processo quebram.
// uso: node scripts/assets/kaykit-props.mjs <pasta gltf do pacote> <public/assets/tavern>
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeIO, PropertyType, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, flatten, join as joinMeshes, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const [INPUT, OUT] = process.argv.slice(2);
/** A paleta do pacote, ao lado da pasta gltf. */
const PALETTE_PNG = join(INPUT, '..', 'texture', 'dungeon_texture.png');
if (!INPUT || !OUT) throw new Error('uso: node scripts/assets/kaykit-props.mjs <pasta gltf> <saída>');

/**
 * Unidade do pacote para casa do mapa: com 0,65 o tampo da mesa fica a 0,65 (cintura do boneco de
 * 1,5), o banquinho a um terço dele e a cama de casal cabe em 2×2.
 */
const SCALE = 0.65;
/** Quanto a peça pode passar da borda do footprint sem ganhar mais uma casa. */
const OVERHANG = 0.3;
/** A paleta do pacote é de cores chapadas: 256 px bastam e o arquivo fica pequeno. */
const TEXTURE_SIZE = 256;
const TEXTURE_URI = 'textures/kaykit-dungeon.webp';

/** Modelo do pacote, chave da peça e giro: a frente de cada peça olha para +z. */
const PIECES = [
  ['bed_decorated', 'kay-cama'],
  ['bed_floor', 'kay-cama-palha'],
  ['keg_decorated', 'kay-barril-chope'],
  ['barrel_small_stack', 'kay-barris'],
  ['table_long_decorated_A', 'kay-mesa-banquete'],
  ['table_medium_tablecloth', 'kay-mesa-toalha'],
  ['table_small_decorated_A', 'kay-mesinha'],
  ['stool', 'kay-banquinho'],
  ['shelves', 'kay-estante'],
  ['shelf_small_candles', 'kay-prateleira-velas'],
  ['candle_triple', 'kay-candelabro'],
  ['banner_patternA_red', 'kay-estandarte-vermelho'],
  ['banner_shield_blue', 'kay-estandarte-azul'],
  ['crates_stacked', 'kay-caixas'],
  ['coin_stack_large', 'kay-moedas'],
  ['chest_gold', 'kay-bau-ouro'],
  ['sword_shield', 'kay-espada-escudo'],
  ['trunk_large_A', 'kay-arca'],
  ['torch_mounted', 'kay-tocha-parede'],
];

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
  const path = join(INPUT, model.startsWith('chest') ? `${model}.glb` : `${model}.gltf.glb`);
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
      width: Math.max(1, Math.ceil(size[0] - OVERHANG)),
      depth: Math.max(1, Math.ceil(size[2] - OVERHANG)),
    },
    farColor: far,
  });
}
console.log(JSON.stringify(entries, null, 1));
