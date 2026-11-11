import { DEFAULT_AMBIENCE, DEFAULT_TABLE_WEATHER } from '@/domain';
import { DAY_PHASE_LIGHTING, fogRange, mixHex, resolvePreset, sceneLook } from '../ambience';
import {
  MAX_RAIN_DROPS,
  RAIN_STORAGE_KEY,
  rainBox,
  rainDropCount,
  readRainEnabled,
  writeRainEnabled,
  type RainStorage,
} from './weather';

function memoryStorage(initial: Record<string, string> = {}): RainStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('scene look', () => {
  it('shouldKeepTheMapLightWhenTheTableHasNoTimeOfDay', () => {
    const look = sceneLook(DEFAULT_AMBIENCE, DEFAULT_TABLE_WEATHER);
    const preset = resolvePreset(DEFAULT_AMBIENCE.preset);
    expect(look.keyColor).toBe(preset.keyColor);
    expect(look.fogColor).toBe(DEFAULT_AMBIENCE.fogColor);
    expect(look.lightScale).toBe(DEFAULT_AMBIENCE.light);
  });

  it('shouldUseTheTimeOfDayLightsWhenTheMasterPicksOne', () => {
    const look = sceneLook(DEFAULT_AMBIENCE, { weather: 'clear', dayPhase: 'night' });
    expect(look.keyColor).toBe(DAY_PHASE_LIGHTING.night.keyColor);
    expect(look.fogColor).toBe(DAY_PHASE_LIGHTING.night.fogColor);
  });

  it('shouldDarkenAndCloseTheViewWhenItRains', () => {
    const clear = sceneLook(DEFAULT_AMBIENCE, { weather: 'clear', dayPhase: 'day' });
    const rain = sceneLook(DEFAULT_AMBIENCE, { weather: 'rain', dayPhase: 'day' });
    const storm = sceneLook(DEFAULT_AMBIENCE, { weather: 'storm', dayPhase: 'day' });
    expect(rain.lightScale).toBeLessThan(clear.lightScale);
    expect(storm.lightScale).toBeLessThan(rain.lightScale);
    expect(storm.fogReach).toBeLessThan(rain.fogReach);
    expect(rain.fogColor).not.toBe(clear.fogColor);
  });

  it('shouldStretchTheFogWithTheTableWeather', () => {
    const night = fogRange(DEFAULT_AMBIENCE, 40, { weather: 'clear', dayPhase: 'night' });
    const day = fogRange(DEFAULT_AMBIENCE, 40, { weather: 'clear', dayPhase: 'day' });
    expect(day.far).toBeGreaterThan(night.far);
  });

  it('shouldMixHexColors', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('rain', () => {
  it('shouldRainLessOnWeakComputersAndNeverPastTheCap', () => {
    const box = rainBox(40);
    expect(rainDropCount('rain', box, 'low')).toBeLessThan(rainDropCount('rain', box, 'high'));
    expect(rainDropCount('storm', box, 'high')).toBeGreaterThan(rainDropCount('rain', box, 'high'));
    expect(rainDropCount('storm', rainBox(200), 'high')).toBe(MAX_RAIN_DROPS);
  });

  it('shouldGiveSmallMapsABoxThatFillsTheView', () => {
    expect(rainBox(8).width).toBeGreaterThan(8);
    expect(rainBox(100).width).toBeGreaterThan(100);
  });

  it('shouldRememberWhoTurnedTheRainOff', () => {
    const storage = memoryStorage();
    expect(readRainEnabled(storage)).toBe(true);
    writeRainEnabled(storage, false);
    expect(storage.getItem(RAIN_STORAGE_KEY)).toBe('off');
    expect(readRainEnabled(storage)).toBe(false);
  });

  it('shouldKeepTheRainOnWithoutStorage', () => {
    const broken: RainStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readRainEnabled(null)).toBe(true);
    expect(readRainEnabled(broken)).toBe(true);
    expect(() => writeRainEnabled(broken, false)).not.toThrow();
  });
});
