/** Do que está na mesa (mapa aberto, tokens, névoa) ao arquivo próprio do mapa. */
import type { FogState } from '@/domain';
import { serializeMapFile, type FileToken } from '@/domain/map-export';
import type { MapModel } from '@/domain/map-v2';
import type { Token } from '@/features/tokens';
import { JSON_MIME_TYPE } from '../constants';

/** O token como o arquivo guarda: sem id nem dono (o mapa importado é de outra mesa). */
export function toFileToken(token: Token): FileToken {
  return {
    name: token.name,
    kind: token.kind,
    imagePath: token.imagePath,
    modelKey: token.modelKey,
    colorPrimary: token.colorPrimary,
    colorSecondary: token.colorSecondary,
    x: token.x,
    z: token.z,
    size: token.size,
    level: token.level,
    hpCurrent: token.hpCurrent,
    hpMax: token.hpMax,
    notes: token.notes,
    hidden: token.hidden,
  };
}

export type MapFileRequest = {
  name: string;
  model: MapModel;
  /** Nulo = sem tokens no arquivo. */
  tokens: readonly Token[] | null;
  /** Nulo = sem névoa no arquivo. */
  fog: FogState | null;
};

export function createMapFileBlob(request: MapFileRequest): Blob {
  const text = serializeMapFile({
    name: request.name,
    model: request.model,
    ...(request.tokens && { tokens: request.tokens.map(toFileToken) }),
    fog: request.fog,
  });
  return new Blob([text], { type: JSON_MIME_TYPE });
}
