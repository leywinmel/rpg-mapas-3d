/**
 * Modelos .glb do mestre: arquivo no bucket privado map-models e linha em
 * map_assets. O id da linha é o mesmo do arquivo (<uid>/<id>.glb), que é o que
 * o documento do mapa guarda em `asset.assetId`.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import type { MapAsset } from '../types';
import { check, toError, unwrap } from './service-result';

export const MODELS_BUCKET = 'map-models';
const GLB_CONTENT_TYPE = 'model/gltf-binary';
/**
 * Validade da URL assinada (6 h): cobre uma sessão de jogo inteira. O modelo
 * fica em cache depois de baixado; só um modelo novo depois disso pediria URL nova.
 */
export const SIGNED_URL_TTL_S = 6 * 60 * 60;

export type UploadModelInput = { file: Blob; name: string };

export type AssetsService = {
  listMyAssets: () => Promise<MapAsset[]>;
  uploadModel: (input: UploadModelInput) => Promise<MapAsset>;
  deleteAsset: (asset: MapAsset) => Promise<void>;
  /** URL assinada por id; nulo quando o modelo não existe mais ou não pode ser lido. */
  signModelUrls: (assetIds: readonly string[]) => Promise<Record<string, string | null>>;
};

type AssetRow = {
  id: string;
  name: string;
  storage_path: string;
  size_bytes: number;
  created_at: string;
};

const ASSET_COLUMNS = 'id, name, storage_path, size_bytes, created_at';

function toAsset(row: AssetRow): MapAsset {
  return {
    id: row.id,
    name: row.name,
    storagePath: row.storage_path,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

export function modelStoragePath(ownerId: string, assetId: string): string {
  return `${ownerId}/${assetId}.glb`;
}

export function createSupabaseAssetsService(
  client: AppSupabaseClient,
  newId: () => string = () => crypto.randomUUID(),
): AssetsService {
  async function currentUserId(): Promise<string> {
    const { data } = await client.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) throw new Error('Sessão expirada: entre de novo para gerenciar modelos.');
    return userId;
  }

  return {
    async listMyAssets() {
      const ownerId = await currentUserId();
      const rows = unwrap(
        await client
          .from('map_assets')
          .select(ASSET_COLUMNS)
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false }),
      );
      return rows.map(toAsset);
    },

    async uploadModel({ file, name }) {
      const ownerId = await currentUserId();
      const id = newId();
      const path = modelStoragePath(ownerId, id);
      const storage = client.storage.from(MODELS_BUCKET);
      const uploaded = await storage.upload(path, file, {
        contentType: GLB_CONTENT_TYPE,
        upsert: false,
      });
      if (uploaded.error) throw toError(uploaded.error);
      const inserted = await client
        .from('map_assets')
        .insert({ id, owner_id: ownerId, name, storage_path: path, size_bytes: file.size })
        .select(ASSET_COLUMNS)
        .single();
      if (inserted.error) {
        // Sem a linha ninguém acharia o arquivo: tira do bucket para não ocupar espaço à toa.
        await storage.remove([path]);
        throw toError(inserted.error);
      }
      return toAsset(inserted.data);
    },

    async deleteAsset(asset) {
      // A linha sai primeiro: se o arquivo ficar para trás, é só espaço; o contrário deixaria
      // um modelo listado que não abre.
      check(await client.from('map_assets').delete().eq('id', asset.id));
      const removed = await client.storage.from(MODELS_BUCKET).remove([asset.storagePath]);
      if (removed.error) throw toError(removed.error);
    },

    async signModelUrls(assetIds) {
      const result: Record<string, string | null> = {};
      if (assetIds.length === 0) return result;
      for (const id of assetIds) result[id] = null;
      const rows = unwrap(
        await client
          .from('map_assets')
          .select('id, storage_path')
          .in('id', [...assetIds]),
      );
      if (rows.length === 0) return result;
      const signed = unwrap(
        await client.storage.from(MODELS_BUCKET).createSignedUrls(
          rows.map((row) => row.storage_path),
          SIGNED_URL_TTL_S,
        ),
      );
      const urlByPath = new Map(signed.map((item) => [item.path, item.signedUrl]));
      for (const row of rows) result[row.id] = urlByPath.get(row.storage_path) || null;
      return result;
    },
  };
}
