// Redimensiona uma imagem e grava em webp. Roda num processo próprio: o `ndarray-pixels` do
// gltf-transform carrega outro sharp (0.35) e os dois libvips no mesmo processo quebram
// ("colourspace: parameter space not set").
// uso: node scripts/assets/texture-webp.mjs <entrada> <saida.webp> <tamanho máximo em px>
import sharp from 'sharp';

const [input, output, size] = process.argv.slice(2);
const max = Number(size);
await sharp(input).resize(max, max, { fit: 'inside' }).webp({ quality: 85 }).toFile(output);
