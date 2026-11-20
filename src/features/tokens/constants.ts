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
  { value: 'monsters', label: 'Monstros' },
  { value: 'horror', label: 'Horror' },
  { value: 'modern', label: 'Moderno e cyberpunk' },
  { value: 'townsfolk', label: 'Gente' },
  { value: 'animals', label: 'Animais' },
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
  { value: 'cleric', label: 'Clérigo', group: 'heroes', file: 'cleric', height: 3 },
  { value: 'monk', label: 'Monge', group: 'heroes', file: 'monk', height: 2.95 },
  { value: 'ranger', label: 'Patrulheira', group: 'heroes', file: 'ranger', height: 3 },
  {
    value: 'thief',
    label: 'Assassino encapuzado',
    group: 'heroes',
    file: 'thief',
    height: 3,
  },
  { value: 'warrior', label: 'Guerreiro', group: 'heroes', file: 'warrior', height: 2.95 },
  { value: 'wizard', label: 'Arquimago', group: 'heroes', file: 'wizard', height: 3.1 },
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
  { value: 'zombie', label: 'Zumbi', group: 'undead', file: 'zombie', height: 2.75 },
  // O fantasma paira: a altura conta o voo.
  { value: 'ghost', label: 'Fantasma', group: 'undead', file: 'ghost', height: 2.9 },
  // Morcego e dragão pairam voando: a altura conta o voo, para não ficarem gigantes.
  { value: 'bat', label: 'Morcego gigante', group: 'monsters', file: 'bat', height: 4.1 },
  { value: 'dragon', label: 'Dragão filhote', group: 'monsters', file: 'dragon', height: 3.9 },
  { value: 'goblin', label: 'Goblin', group: 'monsters', file: 'goblin', height: 3.7 },
  { value: 'orc', label: 'Orc', group: 'monsters', file: 'orc', height: 2.7 },
  { value: 'yeti', label: 'Yeti', group: 'monsters', file: 'yeti', height: 2 },
  { value: 'slime', label: 'Gosma', group: 'monsters', file: 'slime', height: 3.7 },
  // As pernas abertas da aranha passam da base: mais baixa para não cobrir as casas vizinhas.
  { value: 'spider', label: 'Aranha gigante', group: 'monsters', file: 'spider', height: 4.2 },
  {
    value: 'mushroom-king',
    label: 'Rei cogumelo',
    group: 'monsters',
    file: 'mushroom-king',
    height: 3.45,
  },
  { value: 'demon', label: 'Diabrete', group: 'monsters', file: 'demon', height: 2.8 },
  { value: 'tentacle', label: 'Tentáculo', group: 'horror', file: 'tentacle', height: 13 },
  { value: 'alien', label: 'Criatura cósmica', group: 'horror', file: 'alien', height: 3.75 },
  { value: 'swat', label: 'Agente tático', group: 'modern', file: 'swat', height: 1.81 },
  { value: 'soldier', label: 'Mercenária', group: 'modern', file: 'soldier', height: 1.79 },
  { value: 'hazmat', label: 'Traje de proteção', group: 'modern', file: 'hazmat', height: 2.02 },
  // O drone paira na altura do peito: menor que gente.
  { value: 'robot', label: 'Drone de combate', group: 'modern', file: 'robot', height: 1.2 },
  { value: 'farmer', label: 'Fazendeiro', group: 'townsfolk', file: 'farmer', height: 1.82 },
  { value: 'king', label: 'Rei', group: 'townsfolk', file: 'king', height: 1.87 },
  { value: 'witch', label: 'Bruxa', group: 'townsfolk', file: 'witch', height: 2.01 },
  // Bichos no tamanho de verdade, um pouco exagerado para o pequeno não sumir: a "altura" é a do
  // arquivo dividida pela fração da altura de gente (gato meio metro, cavalo da altura de gente).
  { value: 'cat', label: 'Gato', group: 'animals', file: 'cat', height: 5.1 },
  { value: 'dog', label: 'Cachorro', group: 'animals', file: 'dog', height: 3.8 },
  { value: 'rat', label: 'Rato', group: 'animals', file: 'rat', height: 11.5 },
  { value: 'chicken', label: 'Galinha', group: 'animals', file: 'chicken', height: 4.6 },
  { value: 'pig', label: 'Porco', group: 'animals', file: 'pig', height: 4 },
  { value: 'sheep', label: 'Ovelha', group: 'animals', file: 'sheep', height: 8.2 },
  { value: 'fox', label: 'Raposa', group: 'animals', file: 'fox', height: 5.75 },
  { value: 'wolf', label: 'Lobo', group: 'animals', file: 'wolf', height: 4 },
  { value: 'deer', label: 'Cervo', group: 'animals', file: 'deer', height: 4.9 },
  { value: 'cow', label: 'Vaca', group: 'animals', file: 'cow', height: 5.8 },
  { value: 'horse', label: 'Cavalo', group: 'animals', file: 'horse', height: 4.85 },
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
