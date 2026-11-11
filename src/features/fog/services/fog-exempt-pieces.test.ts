import { PACK_PIECES } from '@/features/scene/catalog/pack-pieces';

/**
 * A tabela fog_exempt_pieces (as peças que o jogador recebe mesmo sob a névoa) é populada nas
 * migrations com as chaves de telhado do catálogo. O banco não conhece o catálogo TS, então este
 * teste é o elo entre os dois: telhado novo no catálogo pede uma migration nova, e vice-versa.
 */
const MIGRATIONS = import.meta.glob<string>('/supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const INSERT_PATTERN = /insert into public\.fog_exempt_pieces \(key\) values([\s\S]*?);/g;
const KEY_PATTERN = /'([^']+)'/g;

function exemptKeysInMigrations(): string[] {
  const keys = new Set<string>();
  for (const sql of Object.values(MIGRATIONS)) {
    for (const insert of sql.matchAll(INSERT_PATTERN)) {
      for (const key of insert[1]!.matchAll(KEY_PATTERN)) keys.add(key[1]!);
    }
  }
  return [...keys].sort();
}

describe('fog_exempt_pieces (telhados imunes à névoa)', () => {
  const roofKeys = PACK_PIECES.filter((piece) => piece.category === 'roof')
    .map((piece) => piece.key)
    .sort();
  const exempt = exemptKeysInMigrations();

  it('o catálogo tem telhados', () => {
    expect(roofKeys.length).toBeGreaterThan(0);
  });

  it('toda chave de telhado do catálogo está numa migration, e nada além delas', () => {
    expect(exempt).toEqual(roofKeys);
  });
});
