/** Quantidade de cores de avatar definidas em tokens.css (--avatar-1 … --avatar-8). */
const AVATAR_COLOR_COUNT = 8;

/** Iniciais do apelido: "Ana Clara" → "AC"; "bia" → "B"; vazio → "?". */
export function initialsOf(nickname: string): string {
  const words = nickname.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** Mesma pessoa, mesma cor, em qualquer tela (cor derivada do id, não do apelido). */
export function avatarColorIndex(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return (hash % AVATAR_COLOR_COUNT) + 1;
}
