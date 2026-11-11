/**
 * Névoa e tokens do mapa importado, gravados pelos serviços das features fog e tokens. O token
 * de imagem leva uma CÓPIA da imagem (baixada e enviada de novo): dividir o arquivo com o token
 * original faria apagar um sumir com a imagem do outro.
 */
import { planFogSave } from '@/domain';
import type { FileToken } from '@/domain/map-export';
import { getFogService, type FogService } from '@/features/fog';
import {
  DEFAULT_TOKEN_COLORS,
  getTokensService,
  TOKEN_MODEL_KEYS,
  type TokenModelKey,
  type TokensService,
} from '@/features/tokens';
import { logger } from '@/lib/logger';
import type { TableImportTarget, TokenImportResult } from './map-importer';

type TokenLook = Parameters<TokensService['createToken']>[0]['look'];

const FALLBACK_MODEL: TokenModelKey = 'figure';
const COPIED_IMAGE_NAME = 'token';

function isModelKey(key: string | null): key is TokenModelKey {
  return key !== null && (TOKEN_MODEL_KEYS as readonly string[]).includes(key);
}

function modelLook(token: FileToken): TokenLook {
  return {
    kind: 'model',
    modelKey: isModelKey(token.modelKey) ? token.modelKey : FALLBACK_MODEL,
    colorPrimary: token.colorPrimary ?? DEFAULT_TOKEN_COLORS.primary,
    colorSecondary: token.colorSecondary ?? DEFAULT_TOKEN_COLORS.secondary,
  };
}

export type TableTargetDeps = {
  fog: Pick<FogService, 'saveFog'>;
  tokens: Pick<TokensService, 'createToken' | 'updateToken' | 'getImageUrl'>;
  fetchFile: (url: string) => Promise<Blob>;
};

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Imagem indisponível (${response.status}).`);
  return response.blob();
}

export function createTableImportTarget(
  deps: TableTargetDeps = {
    fog: getFogService(),
    tokens: getTokensService(),
    fetchFile: fetchBlob,
  },
): TableImportTarget {
  /** A imagem do token original como arquivo novo; null quando ela não está mais lá. */
  async function copyImage(path: string): Promise<File | null> {
    try {
      const blob = await deps.fetchFile(await deps.tokens.getImageUrl(path));
      return new File([blob], COPIED_IMAGE_NAME, { type: blob.type });
    } catch (error) {
      // Contornável: o token vira boneco, e a tela avisa no fim da importação.
      logger.warn('Imagem de token do arquivo indisponível.', { feature: 'export' }, error);
      return null;
    }
  }

  async function lookOf(token: FileToken): Promise<{ look: TokenLook; result: TokenImportResult }> {
    if (token.kind === 'asset') {
      if (token.modelAssetId)
        return { look: { kind: 'asset', assetId: token.modelAssetId }, result: 'created' };
      return { look: modelLook(token), result: 'fallback' };
    }
    if (token.kind !== 'image' || !token.imagePath) {
      return { look: modelLook(token), result: 'created' };
    }
    const image = await copyImage(token.imagePath);
    if (!image) return { look: modelLook(token), result: 'fallback' };
    return { look: { kind: 'image', image }, result: 'created' };
  }

  return {
    async saveFog(mapId, fog) {
      await deps.fog.saveFog(mapId, planFogSave(null, fog));
    },

    async createToken({ mapId, token, onCreated, previousId }) {
      let tokenId = previousId;
      let result: TokenImportResult = 'created';
      if (!tokenId) {
        const { look, result: lookResult } = await lookOf(token);
        result = lookResult;
        const input = {
          mapId,
          ownerId: null,
          name: token.name,
          size: token.size,
          x: token.x,
          z: token.z,
          level: token.level,
          hpMax: token.hpMax,
          hidden: token.hidden,
        };
        let created;
        try {
          created = await deps.tokens.createToken({ ...input, look });
        } catch (error) {
          if (look.kind !== 'asset') throw error;
          // O modelo é de outro mestre ou foi apagado: o banco recusa, e o token vira boneco.
          logger.warn(
            'Modelo do token não está na biblioteca de quem importa.',
            { feature: 'export' },
            error,
          );
          created = await deps.tokens.createToken({ ...input, look: modelLook(token) });
          result = 'fallback';
        }
        tokenId = created.id;
        onCreated(tokenId);
      }
      // O token nasce com a vida cheia e sem notas: o resto vem numa segunda gravação.
      const hpChanged = token.hpCurrent !== token.hpMax;
      if (hpChanged || token.notes) {
        await deps.tokens.updateToken(tokenId, {
          ...(hpChanged && { hpCurrent: token.hpCurrent }),
          ...(token.notes && { notes: token.notes }),
        });
      }
      return result;
    },
  };
}
