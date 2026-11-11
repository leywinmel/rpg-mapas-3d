// Converte um personagem .glb (KayKit, CC0) num token do rpgmaps: só a animação parada
// ("Idle"), geometria quantizada e comprimida (meshopt) e textura em webp de 512 px.
// uso: node scripts/assets/convert-token.mjs <personagem.glb> <chave> <public/assets/tokens>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, resample } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const [SOURCE, KEY, OUT] = process.argv.slice(2);
const IDLE = /^idle$/i;
const TEXTURE_SIZE = 512;

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.readBinary(readFileSync(SOURCE));
const root = doc.getRoot();

const animations = root.listAnimations();
const idle = animations.find((animation) => IDLE.test(animation.getName()));
if (!idle) throw new Error(`${SOURCE}: sem animação Idle (${animations.map((a) => a.getName()).join(', ')})`);
// Canais e amostradores também: só descartar a animação deixaria os acessores órfãos no arquivo.
for (const animation of animations) {
  if (animation === idle) continue;
  animation.listChannels().forEach((channel) => channel.dispose());
  animation.listSamplers().forEach((sampler) => sampler.dispose());
  animation.dispose();
}
idle.setName('Idle');

// Texturas em webp num processo à parte (ver texture-webp.mjs).
const webpScript = join(dirname(fileURLToPath(import.meta.url)), 'texture-webp.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'rpgmaps-token-'));
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
  resample(),
  // Os pesos e índices do esqueleto ficam como estão: quantizar WEIGHTS muda a pose.
  quantize({ pattern: /^(POSITION|NORMAL|TEXCOORD_0)$/, quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }),
  reorder({ encoder: MeshoptEncoder }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
root.listBuffers().forEach((buffer) => buffer.setURI(`${KEY}.bin`));
root.listTextures().forEach((texture, index) => texture.setURI(`${KEY}-${index}.webp`));

mkdirSync(OUT, { recursive: true });
const { json, resources } = await io.writeJSON(doc, { basename: KEY });
writeFileSync(join(OUT, `${KEY}.gltf`), JSON.stringify(json));
for (const [name, bytes] of Object.entries(resources)) writeFileSync(join(OUT, name), bytes);
const total = Object.values(resources).reduce((sum, bytes) => sum + bytes.byteLength, 0);
console.log(KEY, `${(total / 1024).toFixed(0)} KB`, Object.keys(resources).join(','));
