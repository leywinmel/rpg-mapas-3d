import {
  DAY_PHASES,
  DEFAULT_TABLE_WEATHER,
  showsRain,
  toTableWeather,
  WEATHER_KINDS,
} from './table-weather';

// Os códigos vivem em dois lugares: as tabelas de domínio (migrations) e as listas daqui. Este
// teste lê as migrations e garante que nenhum código fica sem o outro lado.
const migrations = import.meta.glob('../../supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const INSERT_ROW = /\('([a-z0-9-]+)',\s*'[^']+'\)/g;

function codesInsertedInto(table: string): string[] {
  const codes: string[] = [];
  for (const sql of Object.values(migrations)) {
    for (const block of sql.split(`insert into public.${table}`).slice(1)) {
      const values = block.split(';')[0] ?? '';
      for (const match of values.matchAll(INSERT_ROW)) codes.push(match[1]!);
    }
  }
  return codes.sort();
}

describe('table weather', () => {
  it('shouldMatchTheDomainTablesOfTheDatabase', () => {
    expect(codesInsertedInto('weather_kinds')).toEqual([...WEATHER_KINDS].sort());
    expect(codesInsertedInto('day_phases')).toEqual([...DAY_PHASES].sort());
  });

  it('shouldFallBackToClearSkyForUnknownCodes', () => {
    expect(toTableWeather('neve', 42)).toEqual(DEFAULT_TABLE_WEATHER);
    expect(toTableWeather('storm', 'night')).toEqual({ weather: 'storm', dayPhase: 'night' });
  });

  it('shouldRainOnlyWhenTheMasterTurnedItOnAndThePlayerKeptItOn', () => {
    expect(showsRain('rain', true)).toBe(true);
    expect(showsRain('storm', true)).toBe(true);
    expect(showsRain('rain', false)).toBe(false);
    expect(showsRain('clear', true)).toBe(false);
  });
});
