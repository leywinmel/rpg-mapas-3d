/**
 * Tempo e hora da mesa na cena, mais a escolha local de ver ou não a chuva. Fica fora do Canvas:
 * a sala grava o que veio do banco e a cena (pacote do three) lê o mesmo valor, sem passar
 * propriedade por todas as camadas do mapa.
 */
import { create } from 'zustand';
import { DEFAULT_TABLE_WEATHER, type TableWeather } from '@/domain';
import { browserRainStorage, readRainEnabled, writeRainEnabled } from './weather';

type WeatherState = {
  table: TableWeather;
  /** Esta pessoa quer ver a chuva (salvo no navegador). */
  rainEnabled: boolean;
  setTable: (table: TableWeather) => void;
  setRainEnabled: (enabled: boolean) => void;
};

export const useWeatherStore = create<WeatherState>((set) => ({
  table: DEFAULT_TABLE_WEATHER,
  rainEnabled: readRainEnabled(browserRainStorage()),
  setTable: (table) => set({ table }),
  setRainEnabled: (rainEnabled) => {
    writeRainEnabled(browserRainStorage(), rainEnabled);
    set({ rainEnabled });
  },
}));

export function useTableWeather(): TableWeather {
  return useWeatherStore((state) => state.table);
}
