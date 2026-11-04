import { createFogState, paintFogRect } from '@/domain';
import { fillFogPixels, fogPixelCount } from './fog-texture';

const BLACK = { r: 0, g: 0, b: 0 };

describe('fillFogPixels', () => {
  it('shouldMarkOnlyCoveredCellsAsOpaqueWithRowsFlipped', () => {
    const fog = paintFogRect(
      createFogState({ width: 3, depth: 2 }, true),
      { x: 2, z: 0, width: 1, depth: 1 },
      true,
    );
    const pixels = new Uint8Array(fogPixelCount(fog));
    fillFogPixels(fog, BLACK, pixels);
    const alpha = Array.from({ length: 6 }, (_, index) => pixels[index * 4 + 3]);
    // Linha de cima da textura = z 1; a casa (2, 0) fica na linha de baixo.
    expect(alpha).toEqual([0, 0, 0, 0, 0, 255]);
  });

  it('shouldLeaveEverythingClearWhenFogIsOff', () => {
    const fog = createFogState({ width: 2, depth: 2 }, false, true);
    const pixels = new Uint8Array(fogPixelCount(fog));
    fillFogPixels(fog, BLACK, pixels);
    expect(pixels.filter((_, index) => index % 4 === 3).every((value) => value === 0)).toBe(true);
  });
});
