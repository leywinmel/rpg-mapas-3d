// Medidas do tijolo, compartilhadas pela malha (brick-walls.mjs) e pela textura (brick-texture.mjs):
// as fiadas da malha e as juntas da textura precisam cair no mesmo lugar.

/** Altura de uma fiada (tijolo + junta), em casas. */
export const COURSE = 0.1;
export const BRICK_LENGTH = 0.25;
export const JOINT = 0.012;
/** Variação de tom de um tijolo para outro, para a parede não parecer pintada. */
export const SHADE_SPREAD = 0.16;
/** Tijolo e massa em sRGB (0 a 255). A massa da malha usa o mesmo tom em linear. */
export const BRICK_RGB = [150, 70, 48];
export const MORTAR_RGB = [170, 162, 149];
/** A textura cobre 1 casa de largura por 1 de altura e repete nas duas direções. */
export const TEXTURE_PX = 256;
export const TEXTURE_URI = 'textures/brick-relief.webp';
