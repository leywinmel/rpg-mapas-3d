import { createFogState } from '@/domain';
import { setLogSink } from '@/lib/logger';
import { FOG_SAVE_DELAY_MS } from '../constants';
import { useFogStore } from '../hooks/fog-store';
import type { FogChannel } from './fog-channel';
import { createFogSaver, fogCovers } from './fog-runtime';
import type { FogService } from './fog-service';

const MAP_ID = '11111111-1111-4111-8111-111111111111';

function setup(saveFog: FogService['saveFog']) {
  const channel = { announce: vi.fn(async () => undefined), close: vi.fn() } satisfies FogChannel;
  const save = vi.fn(saveFog);
  const service = { loadFog: vi.fn(), saveFog: save } as unknown as FogService;
  const saver = createFogSaver({ service, channel: () => channel });
  return { saver, channel, save };
}

describe('fog runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setLogSink(() => undefined);
    useFogStore.getState().reset();
    useFogStore.getState().setMap(MAP_ID);
    useFogStore.getState().setLoaded(createFogState({ width: 40, depth: 40 }, true));
  });
  afterEach(() => vi.useRealTimers());

  it('shouldSaveOnlyOnceAfterTheStrokePauses', async () => {
    const { saver, channel, save } = setup(async () => undefined);
    useFogStore.getState().paintRect({ x: 0, z: 0, width: 2, depth: 2 }, true);
    saver.schedule();
    useFogStore.getState().paintRect({ x: 35, z: 35, width: 2, depth: 2 }, true);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(FOG_SAVE_DELAY_MS);
    expect(save).toHaveBeenCalledTimes(1);
    // Dois pedaços tocados, (0,0) e (1,1): o resto do mapa não vai pela rede.
    expect(save.mock.calls[0]?.[1].upserts).toHaveLength(2);
    expect(channel.announce).toHaveBeenCalledWith(MAP_ID);
    expect(useFogStore.getState().saveStatus).toBe('saved');
  });

  it('shouldKeepTheErrorAndNotAnnounceWhenTheSaveFails', async () => {
    const { saver, channel } = setup(async () => {
      throw new Error('falhou');
    });
    useFogStore.getState().fill(true);
    saver.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(useFogStore.getState().saveStatus).toBe('error');
    expect(channel.announce).not.toHaveBeenCalled();
  });

  it('shouldSkipTheNetworkWhenNothingChanged', async () => {
    const { saver, save } = setup(async () => undefined);
    saver.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).not.toHaveBeenCalled();
  });

  it('shouldTellTokensWhenTheirAreaIsCovered', () => {
    useFogStore.getState().paintRect({ x: 2, z: 2, width: 2, depth: 2 }, true);
    expect(fogCovers({ x: 2, z: 2 }, 2)).toBe(true);
    expect(fogCovers({ x: 3, z: 3 }, 2)).toBe(false);
  });
});
