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

/** Bonecos embutidos (tabela token_models); o rótulo é o texto da tela. */
export const TOKEN_MODELS = [
  { value: 'figure', label: 'Aventureiro' },
  { value: 'creature', label: 'Criatura' },
] as const;
export type TokenModelKey = (typeof TOKEN_MODELS)[number]['value'];
export const TOKEN_MODEL_KEYS = TOKEN_MODELS.map((model) => model.value) as [
  TokenModelKey,
  ...TokenModelKey[],
];

export const TOKEN_KINDS = ['image', 'model'] as const;
export type TokenKind = (typeof TOKEN_KINDS)[number];

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
} as const;

/** No arraste, no máximo um aviso a cada tanto: a grade já reduz a uma mensagem por casa. */
export const DRAG_BROADCAST_INTERVAL_MS = 60;

/** Avisos em sequência (névoa, reconexão) viram uma recarga só dentro deste intervalo. */
export const TOKENS_RELOAD_DELAY_MS = 250;
