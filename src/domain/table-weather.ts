/**
 * Tempo e hora da mesa (RPG-38, RPG-39). O mestre escolhe para a mesa inteira; os valores são os
 * mesmos das tabelas de domínio weather_kinds e day_phases (ver supabase/migrations), e um teste
 * garante que as listas não divergem.
 */

/** Tempo que a mesa vê: céu limpo, chuva ou tempestade (chuva forte com relâmpagos). */
export const WEATHER_KINDS = ['clear', 'rain', 'storm'] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];

/** Hora do dia; `map` mantém a luz que o mestre montou no mapa. */
export const DAY_PHASES = ['map', 'day', 'dusk', 'night'] as const;
export type DayPhase = (typeof DAY_PHASES)[number];

export type TableWeather = { weather: WeatherKind; dayPhase: DayPhase };

export const DEFAULT_TABLE_WEATHER: TableWeather = { weather: 'clear', dayPhase: 'map' };

export const WEATHER_LABELS: Readonly<Record<WeatherKind, string>> = {
  clear: 'Limpo',
  rain: 'Chuva',
  storm: 'Tempestade',
};

export const DAY_PHASE_LABELS: Readonly<Record<DayPhase, string>> = {
  map: 'Do mapa',
  day: 'Dia',
  dusk: 'Entardecer',
  night: 'Noite',
};

export function isWeatherKind(value: unknown): value is WeatherKind {
  return typeof value === 'string' && (WEATHER_KINDS as readonly string[]).includes(value);
}

export function isDayPhase(value: unknown): value is DayPhase {
  return typeof value === 'string' && (DAY_PHASES as readonly string[]).includes(value);
}

/** Linha do banco para o domínio: valor desconhecido (versão futura) cai no padrão. */
export function toTableWeather(weather: unknown, dayPhase: unknown): TableWeather {
  return {
    weather: isWeatherKind(weather) ? weather : DEFAULT_TABLE_WEATHER.weather,
    dayPhase: isDayPhase(dayPhase) ? dayPhase : DEFAULT_TABLE_WEATHER.dayPhase,
  };
}

/** Só chove na tela de quem não desligou a chuva, e só quando o mestre ligou. */
export function showsRain(weather: WeatherKind, rainEnabledLocally: boolean): boolean {
  return weather !== 'clear' && rainEnabledLocally;
}
