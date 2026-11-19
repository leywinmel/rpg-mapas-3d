import { describe, expect, it } from 'vitest';
import { READY_MAPS } from '@/domain/map-gen';
import { DEFAULT_READY_VALUES, parseReadyMap } from './ready-form';

describe('formulário de mapas prontos', () => {
  it('shouldStartWithTheFirstReadyMapAndItsName', () => {
    expect(DEFAULT_READY_VALUES).toEqual({ mapId: READY_MAPS[0]!.id, name: READY_MAPS[0]!.name });
  });

  it('shouldBuildTheChosenMapWithTheGivenName', () => {
    const parsed = parseReadyMap({ mapId: 'navio', name: '  Pérola  ' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.request.name).toBe('Pérola');
    expect(parsed.request.build().size).toEqual(READY_MAPS[0]!.size);
  });

  it('shouldRefuseAnEmptyNameOrAnUnknownMap', () => {
    expect(parseReadyMap({ mapId: 'navio', name: '   ' }).ok).toBe(false);
    expect(parseReadyMap({ mapId: 'nada', name: 'Mapa' })).toEqual({
      ok: false,
      error: 'Escolha um dos mapas prontos.',
    });
  });
});
