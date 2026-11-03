/**
 * Níveis de qualidade da cena (decisão 7 de 01/11: em PC fraco a qualidade se ajusta sozinha,
 * e cada pessoa pode escolher num botão). TypeScript puro: a escolha, o passo para cima e para
 * baixo e a leitura do que ficou salvo no navegador.
 */
import { logger } from '@/lib/logger';

export const QUALITY_LEVELS = ['low', 'medium', 'high'] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

/** "auto" deixa a cena medir o próprio desempenho e escolher o nível. */
export type QualityMode = 'auto' | QualityLevel;
/** Ordem do botão: do automático para o mais bonito, descendo até o mais leve. */
export const QUALITY_MODES: readonly QualityMode[] = ['auto', 'high', 'medium', 'low'];

export type QualitySettings = {
  /** A luz principal projeta sombra? A sombra redesenha a cena inteira mais uma vez. */
  readonly shadows: boolean;
  /** Resolução do mapa de sombra, em pixels por lado. */
  readonly shadowMapSize: number;
  /** Teto da densidade de pixels: em tela de alta densidade, o maior custo por quadro. */
  readonly maxPixelRatio: number;
  /** Até esta distância da câmera o pedaço sai completo; além dela, só terreno e paredes em blocos lisos. */
  readonly detailDistance: number;
};

/**
 * O alto é o visual de sempre: num mapa de até 100×100 nada fica longe o bastante para perder
 * detalhe (a câmera mais afastada fica a ~300 unidades da ponta oposta).
 */
export const QUALITY_SETTINGS: Readonly<Record<QualityLevel, QualitySettings>> = {
  high: { shadows: true, shadowMapSize: 2048, maxPixelRatio: 1.5, detailDistance: 400 },
  medium: { shadows: true, shadowMapSize: 1024, maxPixelRatio: 1.25, detailDistance: 180 },
  low: { shadows: false, shadowMapSize: 1024, maxPixelRatio: 1, detailDistance: 90 },
};

export const DEFAULT_QUALITY_MODE: QualityMode = 'auto';
/** O automático começa no alto e só desce se a medição mandar. */
export const AUTO_START_LEVEL: QualityLevel = 'high';

export const QUALITY_MODE_LABELS: Readonly<Record<QualityMode, string>> = {
  auto: 'automática',
  high: 'alta',
  medium: 'média',
  low: 'baixa',
};

function stepLevel(level: QualityLevel, step: number): QualityLevel {
  const index = QUALITY_LEVELS.indexOf(level) + step;
  return QUALITY_LEVELS[Math.min(Math.max(index, 0), QUALITY_LEVELS.length - 1)]!;
}

export function lowerQuality(level: QualityLevel): QualityLevel {
  return stepLevel(level, -1);
}

export function raiseQuality(level: QualityLevel): QualityLevel {
  return stepLevel(level, 1);
}

/** O nível que vale: o escolhido, ou o que a medição achou quando a escolha é "auto". */
export function resolveQuality(mode: QualityMode, autoLevel: QualityLevel): QualityLevel {
  return mode === 'auto' ? autoLevel : mode;
}

/** Próxima opção do botão: automática → alta → média → baixa → automática. */
export function nextQualityMode(mode: QualityMode): QualityMode {
  const index = QUALITY_MODES.indexOf(mode);
  return QUALITY_MODES[(index + 1) % QUALITY_MODES.length]!;
}

export function isQualityMode(value: unknown): value is QualityMode {
  return typeof value === 'string' && (QUALITY_MODES as readonly string[]).includes(value);
}

export const QUALITY_STORAGE_KEY = 'rpgmaps.scene-quality';

/** O pedaço do localStorage que a qualidade usa (trocável nos testes). */
export type QualityStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Só o acesso ao localStorage já pode lançar erro (janela privada, cookies bloqueados). */
export function browserQualityStorage(): QualityStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function logStorageProblem(action: string, error: unknown): void {
  // Sem armazenamento a escolha vale só nesta aba: nada a avisar na tela.
  logger.debug('Sem armazenamento local para a qualidade da cena.', {
    feature: 'scene',
    action,
    reason: error instanceof Error ? error.name : 'unknown',
  });
}

/** O que ficou salvo; valor estranho (editado à mão, versão antiga) vale o padrão. */
export function readQualityMode(storage: QualityStorage | null): QualityMode {
  if (!storage) return DEFAULT_QUALITY_MODE;
  try {
    const saved = storage.getItem(QUALITY_STORAGE_KEY);
    return isQualityMode(saved) ? saved : DEFAULT_QUALITY_MODE;
  } catch (error) {
    logStorageProblem('read-quality', error);
    return DEFAULT_QUALITY_MODE;
  }
}

export function writeQualityMode(storage: QualityStorage | null, mode: QualityMode): void {
  if (!storage) return;
  try {
    storage.setItem(QUALITY_STORAGE_KEY, mode);
  } catch (error) {
    logStorageProblem('write-quality', error);
  }
}

/** Rótulo do botão de qualidade: o que vale agora e o que o próximo clique escolhe. */
export function qualityButtonLabel(mode: QualityMode, level: QualityLevel): string {
  const current =
    mode === 'auto'
      ? `automática (agora ${QUALITY_MODE_LABELS[level]})`
      : QUALITY_MODE_LABELS[mode];
  return `Qualidade da cena: ${current}. Trocar para ${QUALITY_MODE_LABELS[nextQualityMode(mode)]}`;
}
