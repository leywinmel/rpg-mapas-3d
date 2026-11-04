/**
 * A importação de um arquivo como mapa NOVO na mesa, em passos: o mapa (criado e gravado em
 * lotes), a névoa e os tokens. Se um passo falha, o trabalho para nele; "tentar de novo"
 * continua dali (os lotes e tokens já gravados não vão outra vez). Cancelar apaga o mapa
 * incompleto.
 *
 * As dependências (banco do mapa, da névoa e dos tokens) chegam por interface, para o teste
 * passar versões falsas [#20][#45].
 */
import type { FogState } from '@/domain';
import type { FileToken, ImportedMap } from '@/domain/map-export';
import type { MapModel } from '@/domain/map-v2';

/** Lotes gravados do mapa, para a barra de progresso. */
export type BatchProgress = { readonly done: number; readonly total: number };

/**
 * O lado do mapa, um por importação: guarda até onde a gravação chegou. `saveMap` cria o mapa
 * e grava os pedaços em lotes; chamado de novo depois de uma falha, continua do lote que caiu
 * (sem criar outro mapa). `discard` apaga o mapa, se ele chegou a ser criado.
 */
export type MapImportTarget = {
  saveMap: (input: {
    name: string;
    model: MapModel;
    onProgress: (progress: BatchProgress) => void;
  }) => Promise<string>;
  discard: () => Promise<void>;
};

/** Resultado de criar um token: "fallback" quando a imagem não veio e ele virou boneco. */
export type TokenImportResult = 'created' | 'fallback';

/** O lado da mesa: névoa e tokens do mapa novo. */
export type TableImportTarget = {
  saveFog: (mapId: string, fog: FogState) => Promise<void>;
  /**
   * Cria o token. `previousId` é o id criado numa tentativa anterior do mesmo token que caiu
   * depois de criar: aí só termina o que faltou, sem duplicar o token.
   */
  createToken: (input: {
    mapId: string;
    token: FileToken;
    onCreated: (tokenId: string) => void;
    previousId: string | null;
  }) => Promise<TokenImportResult>;
};

export type ImportStage = 'map' | 'fog' | 'tokens' | 'done';

export type ImportProgress = {
  readonly stage: ImportStage;
  /** Lote ou token da vez (prontos) e quantos há na etapa; 0 de 0 quando ainda não se sabe. */
  readonly done: number;
  readonly total: number;
};

export type ImportOutcome = {
  readonly mapId: string;
  /** Tokens de imagem que viraram boneco porque a imagem não estava mais disponível. */
  readonly fallbackTokens: number;
};

export type ImportChoice = {
  readonly name: string;
  readonly includeTokens: boolean;
  readonly includeFog: boolean;
};

export type ImportJob = {
  /** Roda do passo atual até o fim; numa falha, para e lança o erro (o passo fica para depois). */
  run: (onProgress: (progress: ImportProgress) => void) => Promise<ImportOutcome>;
  /** Apaga o mapa incompleto, se ele já foi criado. */
  discard: () => Promise<void>;
};

export type ImportJobInput = {
  imported: ImportedMap;
  choice: ImportChoice;
  map: MapImportTarget;
  table: TableImportTarget;
};

export function createImportJob({ imported, choice, map, table }: ImportJobInput): ImportJob {
  const fog = choice.includeFog ? imported.fog : null;
  const tokens = choice.includeTokens ? imported.tokens : [];
  let mapId: string | null = null;
  let fogSaved = false;
  let tokensDone = 0;
  let fallbackTokens = 0;
  /** Id do token da vez, se ele caiu depois de criar (a nova tentativa só completa). */
  let pendingTokenId: string | null = null;

  async function saveTokens(id: string, onProgress: (progress: ImportProgress) => void) {
    while (tokensDone < tokens.length) {
      onProgress({ stage: 'tokens', done: tokensDone, total: tokens.length });
      const result = await table.createToken({
        mapId: id,
        token: tokens[tokensDone]!,
        previousId: pendingTokenId,
        onCreated: (tokenId) => {
          pendingTokenId = tokenId;
        },
      });
      if (result === 'fallback') fallbackTokens += 1;
      pendingTokenId = null;
      tokensDone += 1;
    }
  }

  return {
    async run(onProgress) {
      if (!mapId) {
        onProgress({ stage: 'map', done: 0, total: 0 });
        mapId = await map.saveMap({
          name: choice.name,
          model: imported.model,
          onProgress: ({ done, total }) => onProgress({ stage: 'map', done, total }),
        });
      }
      if (fog && !fogSaved) {
        onProgress({ stage: 'fog', done: 0, total: 1 });
        await table.saveFog(mapId, fog);
        fogSaved = true;
      }
      await saveTokens(mapId, onProgress);
      onProgress({ stage: 'done', done: tokens.length, total: tokens.length });
      return { mapId, fallbackTokens };
    },

    async discard() {
      await map.discard();
      mapId = null;
      fogSaved = false;
      tokensDone = 0;
      pendingTokenId = null;
    },
  };
}
