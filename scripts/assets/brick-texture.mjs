// Gera a textura das paredes de tijolo: juntas verticais e o tom de cada tijolo. As juntas
// horizontais também aparecem, mas na malha elas já são sulcos de verdade.
// Roda num processo próprio pelo mesmo motivo de texture-webp.mjs (dois libvips brigam).
// uso: node scripts/assets/brick-texture.mjs <saida.webp>
import sharp from 'sharp';
import {
  BRICK_LENGTH,
  BRICK_RGB,
  COURSE,
  JOINT,
  MORTAR_RGB,
  SHADE_SPREAD,
  TEXTURE_PX,
} from './brick-layout.mjs';

const [output] = process.argv.slice(2);
/** Borda do tijolo um pouco mais escura: lê como quina mesmo onde não há geometria. */
const EDGE_SHADE = 0.82;

/** Gerador de números fixo: a textura sai sempre igual a cada execução. */
function random(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const next = random(7);
const course = TEXTURE_PX * COURSE;
const brick = TEXTURE_PX * BRICK_LENGTH;
const halfJoint = (TEXTURE_PX * JOINT) / 2;
const rows = Math.round(1 / COURSE);
const perRow = Math.round(1 / BRICK_LENGTH);
const shades = Array.from({ length: rows * perRow }, () => 1 - SHADE_SPREAD / 2 + next() * SHADE_SPREAD);
const pixels = Buffer.alloc(TEXTURE_PX * TEXTURE_PX * 3);
for (let py = 0; py < TEXTURE_PX; py += 1) {
  const row = Math.floor((py + 0.5) / course);
  const inRow = py + 0.5 - row * course;
  // Fiadas alternadas começam com meio tijolo (amarração).
  const offset = row % 2 === 0 ? 0 : brick / 2;
  for (let px = 0; px < TEXTURE_PX; px += 1) {
    const along = (px + 0.5 + offset) % TEXTURE_PX;
    const column = Math.floor(along / brick);
    const inBrick = along - column * brick;
    const fromEdge = Math.min(inBrick, brick - inBrick, inRow, course - inRow);
    let color = MORTAR_RGB;
    if (fromEdge > halfJoint) {
      const shade = shades[row * perRow + column] * (fromEdge < halfJoint * 2.5 ? EDGE_SHADE : 1);
      color = BRICK_RGB.map((value) => Math.min(255, Math.round(value * shade)));
    }
    pixels.set(color, (py * TEXTURE_PX + px) * 3);
  }
}
await sharp(pixels, { raw: { width: TEXTURE_PX, height: TEXTURE_PX, channels: 3 } })
  .webp({ quality: 88 })
  .toFile(output);
