import { TOKEN_MODELS } from './constants';

// Os códigos de boneco vivem em dois lugares: a tabela de domínio token_models (migrations) e
// TOKEN_MODELS. Este teste lê as migrations e garante que nenhum código fica sem o outro lado.
const migrations = import.meta.glob('../../../supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const INSERT_ROW = /\('([a-z0-9-]+)',\s*'[^']+'\)/g;

function codesInsertedIntoTokenModels(): Set<string> {
  const codes = new Set<string>();
  for (const sql of Object.values(migrations)) {
    for (const block of sql.split('insert into public.token_models').slice(1)) {
      const values = block.split(';')[0] ?? '';
      for (const match of values.matchAll(INSERT_ROW)) codes.add(match[1]!);
    }
  }
  return codes;
}

describe('token models', () => {
  it('shouldHaveEveryCatalogModelInTheDomainTable', () => {
    const inDatabase = codesInsertedIntoTokenModels();
    for (const model of TOKEN_MODELS) expect(inDatabase).toContain(model.value);
  });

  it('shouldHaveEveryDomainRowInTheCatalog', () => {
    const inCatalog = new Set<string>(TOKEN_MODELS.map((model) => model.value));
    for (const code of codesInsertedIntoTokenModels()) expect(inCatalog).toContain(code);
  });

  it('shouldPointReadyModelsToAFileWithAHeight', () => {
    for (const model of TOKEN_MODELS) {
      if (model.file === null) continue;
      expect(model.height).toBeGreaterThan(0);
      expect(model.file).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
