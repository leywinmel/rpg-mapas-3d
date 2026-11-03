import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_QUALITY_MODE,
  lowerQuality,
  nextQualityMode,
  QUALITY_SETTINGS,
  QUALITY_STORAGE_KEY,
  qualityButtonLabel,
  raiseQuality,
  readQualityMode,
  resolveQuality,
  writeQualityMode,
  type QualityStorage,
} from './quality';

function memoryStorage(initial: Record<string, string> = {}): QualityStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  };
}

const brokenStorage: QualityStorage = {
  getItem: () => {
    throw new DOMException('bloqueado', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('cheio', 'QuotaExceededError');
  },
};

describe('quality levels', () => {
  it('shouldStepDownAndUpWithoutPassingTheEnds', () => {
    expect(lowerQuality('high')).toBe('medium');
    expect(lowerQuality('low')).toBe('low');
    expect(raiseQuality('medium')).toBe('high');
    expect(raiseQuality('high')).toBe('high');
  });

  it('shouldCostLessAtEachLevelDown', () => {
    const { high, medium, low } = QUALITY_SETTINGS;
    expect(low.shadows).toBe(false);
    expect(high.maxPixelRatio).toBeGreaterThan(medium.maxPixelRatio);
    expect(medium.maxPixelRatio).toBeGreaterThan(low.maxPixelRatio);
    expect(high.detailDistance).toBeGreaterThan(medium.detailDistance);
    expect(medium.detailDistance).toBeGreaterThan(low.detailDistance);
  });

  it('shouldKeepTheHighLevelAsTheSceneOfBefore', () => {
    // A cena de antes: sombra 2048 e densidade de pixels até 1,5.
    expect(QUALITY_SETTINGS.high).toMatchObject({
      shadows: true,
      shadowMapSize: 2048,
      maxPixelRatio: 1.5,
    });
  });

  it('shouldUseTheMeasuredLevelOnlyInAutomaticMode', () => {
    expect(resolveQuality('auto', 'low')).toBe('low');
    expect(resolveQuality('medium', 'low')).toBe('medium');
  });

  it('shouldCycleTheButtonThroughEveryOption', () => {
    expect(nextQualityMode('auto')).toBe('high');
    expect(nextQualityMode('high')).toBe('medium');
    expect(nextQualityMode('medium')).toBe('low');
    expect(nextQualityMode('low')).toBe('auto');
  });

  it('shouldTellWhatIsOnAndWhatTheClickPicks', () => {
    expect(qualityButtonLabel('auto', 'medium')).toBe(
      'Qualidade da cena: automática (agora média). Trocar para alta',
    );
    expect(qualityButtonLabel('low', 'high')).toBe(
      'Qualidade da cena: baixa. Trocar para automática',
    );
  });
});

describe('saved quality choice', () => {
  it('shouldReadBackWhatWasSaved', () => {
    const storage = memoryStorage();
    writeQualityMode(storage, 'low');
    expect(readQualityMode(storage)).toBe('low');
  });

  it('shouldFallBackToTheDefaultForStrangeValuesOrNoStorage', () => {
    expect(readQualityMode(memoryStorage({ [QUALITY_STORAGE_KEY]: 'ultra' }))).toBe(
      DEFAULT_QUALITY_MODE,
    );
    expect(readQualityMode(null)).toBe(DEFAULT_QUALITY_MODE);
  });

  it('shouldNotBreakWhenTheBrowserBlocksTheStorage', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    expect(readQualityMode(brokenStorage)).toBe(DEFAULT_QUALITY_MODE);
    expect(() => writeQualityMode(brokenStorage, 'high')).not.toThrow();
    expect(debug).toHaveBeenCalledTimes(2);
    debug.mockRestore();
  });
});
