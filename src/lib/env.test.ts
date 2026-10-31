import { parseEnv } from './env';

describe('parseEnv', () => {
  it('shouldAcceptValidSupabaseConfig', () => {
    const result = parseEnv({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'chave-publica',
    });
    expect(result.ok).toBe(true);
  });

  it('shouldListProblemsWhenKeysAreMissing', () => {
    const result = parseEnv({ VITE_SUPABASE_URL: 'nao-e-url' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toHaveLength(2);
  });
});
