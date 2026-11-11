import { z } from 'zod';
import type { Database } from '@/lib/database.types';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import {
  createSupabaseAssetsService,
  SIGNED_URL_TTL_S,
  type AssetsService,
} from '@/features/map-editor/services/assets-service';
import { assetNameFromFile } from '@/features/map-editor/upload/glb-validation';
import type { MapAsset } from '@/features/map-editor/types';
import {
  MS_PER_SECOND,
  TOKEN_IMAGE_EXTENSIONS,
  TOKEN_IMAGE_URL_REUSE_MARGIN_SECONDS,
  TOKEN_IMAGE_URL_TTL_SECONDS,
  TOKEN_IMAGES_BUCKET,
  type TokenImageType,
} from '../constants';
import { checkTokenImage, tokenRowSchema, type TokenRow } from '../schemas';
import type { NewTokenInput, Token, TokenPatch } from '../types';
import { TokenError, toTokenError, tokenFailures } from './token-errors';

type TokenInsert = Database['public']['Tables']['tokens']['Insert'];
type TokenUpdate = Database['public']['Tables']['tokens']['Update'];

const TOKEN_COLUMNS =
  'id, map_id, owner_id, kind, name, image_path, model_key, model_asset_id, color_primary, color_secondary, x, z, size, level, hp_current, hp_max, notes, hidden';

export function toToken(row: TokenRow): Token {
  return {
    id: row.id,
    mapId: row.map_id,
    ownerId: row.owner_id,
    kind: row.kind,
    name: row.name,
    imagePath: row.image_path,
    modelKey: row.model_key,
    modelAssetId: row.model_asset_id,
    colorPrimary: row.color_primary,
    colorSecondary: row.color_secondary,
    x: row.x,
    z: row.z,
    size: row.size,
    level: row.level,
    hpCurrent: row.hp_current,
    hpMax: row.hp_max,
    notes: row.notes,
    hidden: row.hidden,
  };
}

const PATCH_COLUMNS: Readonly<Record<keyof TokenPatch, keyof TokenUpdate>> = {
  name: 'name',
  ownerId: 'owner_id',
  size: 'size',
  x: 'x',
  z: 'z',
  level: 'level',
  hpCurrent: 'hp_current',
  hpMax: 'hp_max',
  notes: 'notes',
  hidden: 'hidden',
  modelKey: 'model_key',
  colorPrimary: 'color_primary',
  colorSecondary: 'color_secondary',
};

/** Só as colunas do que mudou: o jogador dono manda só o que o gatilho do banco deixa. */
function toUpdateRow(patch: TokenPatch): TokenUpdate {
  const row: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(patch)) {
    const column = PATCH_COLUMNS[field as keyof TokenPatch];
    if (column && value !== undefined) row[column] = value;
  }
  return row as TokenUpdate;
}

function parseRow(row: unknown): Token {
  return toToken(tokenRowSchema.parse(row));
}

export type TokensServiceOptions = {
  now?: () => number;
  newId?: () => string;
  /** Biblioteca de modelos .glb do mestre (a mesma do editor de mapas). */
  assets?: AssetsService;
};

type CachedUrl<T> = { url: Promise<T>; reusableUntil: number };
type CachedImageUrl = CachedUrl<string>;

/** Tokens no Supabase (banco e Storage), atrás de uma interface mockável [#20][#45]. */
export function createTokensService(client: AppSupabaseClient, options: TokensServiceOptions = {}) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const imageUrls = new Map<string, CachedImageUrl>();
  const modelUrls = new Map<string, CachedUrl<string | null>>();
  const assets = options.assets ?? createSupabaseAssetsService(client, newId);
  const images = () => client.storage.from(TOKEN_IMAGES_BUCKET);

  async function uploadImage(file: File): Promise<string> {
    if (checkTokenImage(file)) throw new TokenError('image-type', null);
    const { data } = await client.auth.getSession();
    const ownerId = data.session?.user.id;
    if (!ownerId) throw new TokenError('session', null);
    // Pasta = id de quem envia: é o que a política do Storage e o check do banco esperam.
    const extension = TOKEN_IMAGE_EXTENSIONS[file.type as TokenImageType];
    const path = `${ownerId}/${newId()}.${extension}`;
    const { error } = await images().upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw toTokenError(error, 'image-upload');
    return path;
  }

  /** O token já foi resolvido; sobrar um arquivo é só sujeira, não erro para a tela. */
  async function removeImageQuietly(path: string, action: string): Promise<void> {
    imageUrls.delete(path);
    try {
      const { error } = await images().remove([path]);
      if (error) throw error;
    } catch (error) {
      tokenFailures.report(error, { action });
    }
  }

  async function signImageUrl(path: string): Promise<string> {
    const { data, error } = await images().createSignedUrl(path, TOKEN_IMAGE_URL_TTL_SECONDS);
    if (error) throw toTokenError(error);
    return data.signedUrl;
  }

  return {
    /** Tokens do mapa que o RLS deixa ver: o jogador não recebe escondido nem coberto. */
    async listTokens(mapId: string): Promise<Token[]> {
      const { data, error } = await client
        .from('tokens')
        .select(TOKEN_COLUMNS)
        .eq('map_id', z.uuid().parse(mapId))
        .order('created_at');
      if (error) throw toTokenError(error);
      return data.map(parseRow);
    },

    /** Relê um token; null quando ele sumiu ou deixou de ser visível (foi para a névoa). */
    async getToken(tokenId: string): Promise<Token | null> {
      const { data, error } = await client
        .from('tokens')
        .select(TOKEN_COLUMNS)
        .eq('id', z.uuid().parse(tokenId))
        .maybeSingle();
      if (error) throw toTokenError(error);
      return data ? parseRow(data) : null;
    },

    /** Sobe a imagem (se for token de imagem) e cria; se a criação falhar, a imagem não fica órfã. */
    async createToken(input: NewTokenInput): Promise<Token> {
      const { look } = input;
      const imagePath = look.kind === 'image' ? await uploadImage(look.image) : null;
      const row: TokenInsert = {
        map_id: input.mapId,
        owner_id: input.ownerId,
        kind: look.kind,
        name: input.name,
        image_path: imagePath,
        model_key: look.kind === 'model' ? look.modelKey : null,
        model_asset_id: look.kind === 'asset' ? look.assetId : null,
        color_primary: look.kind === 'model' ? look.colorPrimary : null,
        color_secondary: look.kind === 'model' ? look.colorSecondary : null,
        x: input.x,
        z: input.z,
        size: input.size,
        level: input.level,
        hp_max: input.hpMax,
        hp_current: input.hpMax,
        hidden: input.hidden,
      };
      const { data, error } = await client
        .from('tokens')
        .insert(row)
        .select(TOKEN_COLUMNS)
        .single();
      if (error) {
        if (imagePath) await removeImageQuietly(imagePath, 'remove-unsaved-image');
        throw toTokenError(error);
      }
      return parseRow(data);
    },

    async updateToken(tokenId: string, patch: TokenPatch): Promise<Token> {
      const { data, error } = await client
        .from('tokens')
        .update(toUpdateRow(patch))
        .eq('id', z.uuid().parse(tokenId))
        .select(TOKEN_COLUMNS)
        .maybeSingle();
      if (error) throw toTokenError(error);
      // O RLS não dá erro quando bloqueia: só não devolve a linha.
      if (!data) throw new TokenError('not-found', null);
      return parseRow(data);
    },

    /** Apaga a linha primeiro; a imagem vai depois e, se falhar, só vira aviso no log. */
    async deleteToken(token: Pick<Token, 'id' | 'imagePath'>): Promise<void> {
      const { data, error } = await client.from('tokens').delete().eq('id', token.id).select('id');
      if (error) throw toTokenError(error);
      if (data.length === 0) throw new TokenError('not-found', null);
      if (token.imagePath) await removeImageQuietly(token.imagePath, 'remove-deleted-image');
    },

    /** URL assinada da imagem (bucket privado), reaproveitada enquanto vale. */
    getImageUrl(path: string): Promise<string> {
      const cached = imageUrls.get(path);
      if (cached && cached.reusableUntil > now()) return cached.url;
      const validForMs =
        (TOKEN_IMAGE_URL_TTL_SECONDS - TOKEN_IMAGE_URL_REUSE_MARGIN_SECONDS) * MS_PER_SECOND;
      const entry: CachedImageUrl = { url: signImageUrl(path), reusableUntil: now() + validForMs };
      imageUrls.set(path, entry);
      void entry.url.catch(() => {
        if (imageUrls.get(path) === entry) imageUrls.delete(path);
      });
      return entry.url;
    },

    /** Modelos .glb da biblioteca de quem está logado (o mestre), para escolher o do token. */
    listModels(): Promise<MapAsset[]> {
      return assets.listMyAssets().catch((error: unknown) => {
        throw toTokenError(error);
      });
    },

    /** Envia um .glb para a biblioteca do mestre; quem chama já conferiu o arquivo. */
    async uploadModel(file: File): Promise<MapAsset> {
      try {
        return await assets.uploadModel({ file, name: assetNameFromFile(file.name) });
      } catch (error) {
        throw toTokenError(error, 'model-upload');
      }
    },

    /**
     * URL assinada do modelo do token, reaproveitada enquanto vale. Null quando o modelo foi
     * apagado da biblioteca: o token mostra uma caixa no lugar.
     */
    getModelUrl(assetId: string): Promise<string | null> {
      const cached = modelUrls.get(assetId);
      if (cached && cached.reusableUntil > now()) return cached.url;
      const validForMs = (SIGNED_URL_TTL_S - TOKEN_IMAGE_URL_REUSE_MARGIN_SECONDS) * MS_PER_SECOND;
      const url = assets.signModelUrls([assetId]).then((urls) => urls[assetId] ?? null);
      const entry: CachedUrl<string | null> = { url, reusableUntil: now() + validForMs };
      modelUrls.set(assetId, entry);
      void url.catch(() => {
        if (modelUrls.get(assetId) === entry) modelUrls.delete(assetId);
      });
      return url;
    },
  };
}

export type TokensService = ReturnType<typeof createTokensService>;

let defaultService: TokensService | null = null;

export function getTokensService(): TokensService {
  defaultService ??= createTokensService(getSupabase());
  return defaultService;
}
