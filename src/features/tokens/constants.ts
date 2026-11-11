/**
 * Limites e nomes dos tokens. Os valores são os mesmos da tabela `tokens`, da tabela de domínio
 * `token_models` e do bucket `token-images` (ver supabase/migrations): mudar um lado pede mudar o outro.
 */
export const TOKEN_IMAGES_BUCKET = 'token-images';

const BYTES_PER_MEGABYTE = 1024 * 1024;
export const TOKEN_IMAGE_MAX_MEGABYTES = 5;
export const TOKEN_IMAGE_MAX_BYTES = TOKEN_IMAGE_MAX_MEGABYTES * BYTES_PER_MEGABYTE;

export const TOKEN_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type TokenImageType = (typeof TOKEN_IMAGE_MIME_TYPES)[number];

/** O arquivo guardado leva a extensão do tipo (é o que o check tokens_image_path_format aceita). */
export const TOKEN_IMAGE_EXTENSIONS: Readonly<Record<TokenImageType, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Pasta dos bonecos prontos (convertidos por scripts/assets/convert-token.mjs). */
export const TOKEN_MODELS_BASE_URL = '/assets/tokens';

/** Grupos do seletor de boneco, na ordem da tela. */
export const TOKEN_MODEL_GROUPS = [
  { value: 'basic', label: 'Simples (com cores)' },
  { value: 'heroes', label: 'Heróis' },
  { value: 'undead', label: 'Mortos-vivos' },
] as const;
export type TokenModelGroup = (typeof TOKEN_MODEL_GROUPS)[number]['value'];

/**
 * Bonecos embutidos (tabela token_models); o rótulo é o texto da tela. `file` é o nome do
 * modelo em TOKEN_MODELS_BASE_URL; sem ele o boneco é desenhado com primitivas nas duas cores.
 * Altura da peça no arquivo (unidades do kit), para o boneco caber na altura de um token.
 */
export const TOKEN_MODELS = [
  { value: 'figure', label: 'Aventureiro', group: 'basic', file: null, height: null },
  { value: 'creature', label: 'Criatura', group: 'basic', file: null, height: null },
  { value: 'knight', label: 'Cavaleiro', group: 'heroes', file: 'knight', height: 2.5 },
  { value: 'barbarian', label: 'Bárbaro', group: 'heroes', file: 'barbarian', height: 2.5 },
  { value: 'mage', label: 'Mago', group: 'heroes', file: 'mage', height: 2.7 },
  { value: 'rogue', label: 'Ladino', group: 'heroes', file: 'rogue', height: 2.5 },
  {
    value: 'rogue-hooded',
    label: 'Ladino encapuzado',
    group: 'heroes',
    file: 'rogue-hooded',
    height: 2.5,
  },
  {
    value: 'skeleton-warrior',
    label: 'Esqueleto guerreiro',
    group: 'undead',
    file: 'skeleton-warrior',
    height: 2.6,
  },
  {
    value: 'skeleton-mage',
    label: 'Esqueleto mago',
    group: 'undead',
    file: 'skeleton-mage',
    height: 2.6,
  },
  {
    value: 'skeleton-rogue',
    label: 'Esqueleto ladino',
    group: 'undead',
    file: 'skeleton-rogue',
    height: 2.6,
  },
  {
    value: 'skeleton-minion',
    label: 'Esqueleto servo',
    group: 'undead',
    file: 'skeleton-minion',
    height: 2.4,
  },
] as const;
export type TokenModelKey = (typeof TOKEN_MODELS)[number]['value'];
export type TokenModelEntry = (typeof TOKEN_MODELS)[number];

export function tokenModelEntry(key: TokenModelKey): TokenModelEntry {
  const found = TOKEN_MODELS.find((model) => model.value === key);
  if (!found) throw new Error(`boneco desconhecido: ${key}`);
  return found;
}

/** Endereço do arquivo do boneco pronto, ou null para os de primitivas. */
export function tokenModelUrl(entry: TokenModelEntry): string | null {
  return entry.file ? `${TOKEN_MODELS_BASE_URL}/${entry.file}.gltf` : null;
}
export const TOKEN_MODEL_KEYS = TOKEN_MODELS.map((model) => model.value) as [
  TokenModelKey,
  ...TokenModelKey[],
];

// O tipo do token mora no domínio: o arquivo exportado do mapa usa a mesma lista (DRY [#6]).
export { TOKEN_KINDS, type TokenKind } from '@/domain';

/** Cores iniciais do boneco: roupa e detalhe. */
export const DEFAULT_TOKEN_COLORS = { primary: '#8a3b2e', secondary: '#d9b45a' } as const;

/** URL assinada da imagem: vale por uma hora e é reaproveitada até faltar a margem. */
export const TOKEN_IMAGE_URL_TTL_SECONDS = 60 * 60;
export const TOKEN_IMAGE_URL_REUSE_MARGIN_SECONDS = 60;
export const MS_PER_SECOND = 1000;

/** Eventos de broadcast do canal `tokens:<id da mesa>`. Só ids e casas: nada que o RLS esconderia. */
export const TOKEN_EVENTS = {
  /** Alguém está arrastando um token: `{ tokenId, x, z }`. */
  drag: 'token-drag',
  /** Um token foi gravado (criado, movido, editado): os outros releem a linha pelo RLS. */
  saved: 'token-saved',
  /** Um token foi apagado. */
  removed: 'token-removed',
  /**
   * O mestre moveu um carro ou objeto solto do mapa (RPG-27): `{ mapId, pieceId, from, to }`.
   * Vai pelo mesmo canal dos tokens: é o canal do que se move na mesa.
   */
  pieceMoved: 'piece-moved',
} as const;

/** No arraste, no máximo um aviso a cada tanto: a grade já reduz a uma mensagem por casa. */
export const DRAG_BROADCAST_INTERVAL_MS = 60;

/** Avisos em sequência (névoa, reconexão) viram uma recarga só dentro deste intervalo. */
export const TOKENS_RELOAD_DELAY_MS = 250;
