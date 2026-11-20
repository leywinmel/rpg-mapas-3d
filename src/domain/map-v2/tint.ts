/**
 * Tinta de paredes e peças (RPG-33). A cor da tinta MULTIPLICA a do modelo (como uma demão
 * por cima da textura), então as cores da paleta são claras: uma tinta escura apagaria o
 * desenho do tijolo ou da madeira. Branco é "sem tinta" e não é gravado no mapa.
 */

export type TintSwatch = { readonly name: string; readonly color: string };

export const TINT_PALETTE: readonly TintSwatch[] = [
  { name: 'Creme', color: '#f2e6c8' },
  { name: 'Areia', color: '#e0c9a0' },
  { name: 'Ouro', color: '#e8c870' },
  { name: 'Terracota', color: '#d9937a' },
  { name: 'Vinho', color: '#b8707e' },
  { name: 'Musgo', color: '#a8bf8f' },
  { name: 'Petróleo', color: '#86aab0' },
  { name: 'Céu', color: '#a9c4e6' },
  { name: 'Lavanda', color: '#bcaee0' },
  { name: 'Cinza', color: '#bdbdbd' },
  { name: 'Grafite', color: '#7c7c84' },
];

const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const CHANNEL_SHIFTS = [16, 8, 0] as const;

const channels = (hex: string): number[] => {
  const value = Number.parseInt(hex.slice(1), HEX_RADIX);
  return CHANNEL_SHIFTS.map((shift) => (value >> shift) & CHANNEL_MAX);
};

/** A cor de longe de uma peça pintada: cada canal da cor vezes o da tinta, como faz a cena. */
export function multiplyTint(color: string, tint: string | undefined): string {
  if (!tint) return color;
  const base = channels(color);
  const paint = channels(tint);
  const mixed = base.map((value, index) => Math.round((value * paint[index]!) / CHANNEL_MAX));
  return `#${mixed.map((value) => value.toString(HEX_RADIX).padStart(2, '0')).join('')}`;
}

/**
 * Chave de grupo de desenho: peças iguais com tintas diferentes viram malhas diferentes (a
 * tinta vai para a malha toda). A tinta começa com '#', que nenhuma chave de peça usa.
 */
export const tintKey = (key: string, tint: string | undefined): string =>
  tint ? `${key}${tint}` : key;
