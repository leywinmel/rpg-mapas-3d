import { describe, expect, it } from 'vitest';
import { fileNameFor, formatBytes, formatSeconds } from './download';

describe('fileNameFor', () => {
  it('shouldMakeASafeFileNameFromTheMapName', () => {
    expect(fileNameFor('Taverna do Dragão — 2º andar', '.png')).toBe(
      'taverna-do-dragao-2-andar.png',
    );
  });

  it('shouldUseAFallbackWhenTheNameHasNoLetters', () => {
    expect(fileNameFor('!!!', '.glb')).toBe('mapa.glb');
    expect(fileNameFor(undefined, '.glb')).toBe('mapa.glb');
  });
});

describe('formatBytes', () => {
  it('shouldShowKilobytesAndMegabytes', () => {
    expect(formatBytes(10)).toBe('1 KB');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1,5 MB');
  });
});

describe('formatSeconds', () => {
  it('shouldShowSecondsWithComma', () => {
    expect(formatSeconds(1234)).toBe('1,2 s');
  });
});
