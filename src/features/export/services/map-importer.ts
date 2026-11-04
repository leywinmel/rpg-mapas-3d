/**
 * A importação de um arquivo como mapa NOVO na mesa, em passos: criar o mapa, mandar os pedaços
 * em lotes, gravar a névoa e criar os tokens. Se um passo falha, o trabalho para nele; "tentar de
 * novo" continua dali (os lotes já gravados não vão outra vez). Cancelar apaga o mapa incompleto.
 *
 * As dependências (banco do mapa, da névoa e dos tokens) chegam por interface, para o teste
 * passar versões falsas [#20][#45].
 */
import type { FogState, GridSize } from '@/domain';
import { planChunkBatches, type FileToken, type ImportedMap } from '@/domain/map-export';
import { serializeMapModel, type MapHeader, type SerializedChunk } from '@/domain/map-v2';

/** O lado do mapa: criar, gravar lotes de pedaços e apagar (no cancelamento). */
export type MapImportTarget = {
  createMap: (input: { name: string; size: GridSize; header: MapHeader }) => Promise<{
    id: string;
  }>;
  saveChunks: (input: {
    mapId: string;
    header: MapHeader;
    chunks: readonly SerializedChunk[];
  }) => Promise<unknown>;
  deleteMap: (mapId: string) => Promise<void>;
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

export type ImportStage = 'map' | 'chunks' | 'fog' | 'tokens' | 'done';

export type ImportProgress = {
  readonly stage: ImportStage;
  /** Passos prontos e total, para a barra. */
  readonly done: number;
  readonly total: number;
  /** Lote ou token da vez, contado a partir de 1, e quantos há na etapa. */
  readonly item: number;
  readonly items: number;
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

type Step =
  | { stage: 'map' }
  | { stage: 'chunks'; chunks: readonly SerializedChunk[]; item: number; items: number }
  | { stage: 'fog'; fog: FogState }
  | { stage: 'tokens'; token: FileToken; item: number; items: number };

function planSteps(
  chunks: readonly SerializedChunk[],
  imported: ImportedMap,
  choice: ImportChoice,
): Step[] {
  const batches = planChunkBatches(chunks);
  const tokens = choice.includeTokens ? imported.tokens : [];
  return [
    { stage: 'map' },
    ...batches.map((chunks, index): Step => ({
      stage: 'chunks',
      chunks,
      item: index + 1,
      items: batches.length,
    })),
    ...(choice.includeFog && imported.fog ? [{ stage: 'fog', fog: imported.fog } as const] : []),
    ...tokens.map((token, index): Step => ({
      stage: 'tokens',
      token,
      item: index + 1,
      items: tokens.length,
    })),
  ];
}

export type ImportJob = {
  /** Roda do passo atual até o fim; numa falha, para e lança o erro (o passo fica para depois). */
  run: (onProgress: (progress: ImportProgress) => void) => Promise<ImportOutcome>;
  /** Apaga o mapa incompleto, se ele já foi criado. */
  discard: () => Promise<void>;
  /** Quantos lotes de pedaços a importação manda (para a tela contar antes). */
  readonly batchCount: number;
};

export type ImportJobInput = {
  imported: ImportedMap;
  choice: ImportChoice;
  map: MapImportTarget;
  table: TableImportTarget;
};

export function createImportJob({ imported, choice, map, table }: ImportJobInput): ImportJob {
  const { header, chunks } = serializeMapModel(imported.model);
  const { size } = imported.model;
  const steps = planSteps(chunks, imported, choice);
  let cursor = 0;
  let mapId: string | null = null;
  let fallbackTokens = 0;
  /** Id do token criado no passo da vez, se ele caiu depois de criar. */
  let pendingTokenId: string | null = null;

  const progressOf = (step: Step | undefined): ImportProgress => ({
    stage: step?.stage ?? 'done',
    done: cursor,
    total: steps.length,
    item: step && 'item' in step ? step.item : 0,
    items: step && 'items' in step ? step.items : 0,
  });

  async function runStep(step: Step, id: string | null): Promise<void> {
    if (step.stage === 'map') {
      mapId = (await map.createMap({ name: choice.name, size, header })).id;
      return;
    }
    if (!id) throw new Error('O mapa novo ainda não existe.');
    if (step.stage === 'chunks') {
      await map.saveChunks({ mapId: id, header, chunks: step.chunks });
      return;
    }
    if (step.stage === 'fog') {
      await table.saveFog(id, step.fog);
      return;
    }
    const result = await table.createToken({
      mapId: id,
      token: step.token,
      previousId: pendingTokenId,
      onCreated: (tokenId) => {
        pendingTokenId = tokenId;
      },
    });
    if (result === 'fallback') fallbackTokens += 1;
  }

  return {
    batchCount: steps.filter((step) => step.stage === 'chunks').length,

    async run(onProgress) {
      while (cursor < steps.length) {
        const step = steps[cursor]!;
        onProgress(progressOf(step));
        await runStep(step, mapId);
        pendingTokenId = null;
        cursor += 1;
      }
      onProgress(progressOf(undefined));
      if (!mapId) throw new Error('A importação terminou sem criar o mapa.');
      return { mapId, fallbackTokens };
    },

    async discard() {
      if (!mapId) return;
      const id = mapId;
      await map.deleteMap(id);
      mapId = null;
      cursor = 0;
    },
  };
}
