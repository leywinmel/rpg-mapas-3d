import config from '../vercel.json';

function headersFor(source: string): Record<string, string> {
  const rule = config.headers.find((entry) => entry.source === source);
  if (!rule) throw new Error(`sem regra de cabeçalhos para ${source}`);
  return Object.fromEntries(rule.headers.map(({ key, value }) => [key, value]));
}

function cspDirective(name: string): string {
  const csp = headersFor('/(.*)')['Content-Security-Policy'] ?? '';
  const directive = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `) || part === name);
  if (!directive) throw new Error(`CSP sem a diretiva ${name}`);
  return directive;
}

// A publicação na Vercel depende destes cabeçalhos: o teste evita que um ajuste de cache ou de CSP
// derrube o site no ar (a física dos dados é WASM; o Supabase é a única origem externa).
describe('vercel.json', () => {
  it('shouldServeTheSpaFromIndexHtml', () => {
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }]);
  });

  it('shouldAllowWasmForTheDicePhysicsWithoutUnsafeEval', () => {
    const script = cspDirective('script-src');
    expect(script).toContain("'wasm-unsafe-eval'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(script).not.toContain("'unsafe-inline'");
  });

  it('shouldOnlyTalkToSupabaseOverHttpsAndWebSocket', () => {
    const connect = cspDirective('connect-src');
    expect(connect).toContain('https://*.supabase.co');
    expect(connect).toContain('wss://*.supabase.co');
    expect(connect).not.toMatch(/\bhttp:\/\//);
  });

  it('shouldLetTheGltfLoaderFetchEmbeddedTextures', () => {
    // O GLTFLoader lê as texturas embutidas nos modelos por `fetch` em URLs blob:.
    expect(cspDirective('connect-src')).toContain('blob:');
  });

  it('shouldShowStorageImagesAndLocalPreviews', () => {
    const img = cspDirective('img-src');
    expect(img).toContain('https://*.supabase.co');
    expect(img).toContain('blob:');
  });

  it('shouldRefuseToBeFramed', () => {
    expect(cspDirective('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(headersFor('/(.*)')['X-Frame-Options']).toBe('DENY');
    expect(headersFor('/(.*)')['Strict-Transport-Security']).toMatch(/max-age=\d{6,}/);
  });

  it('shouldCacheHashedChunksForeverButNotTheModels', () => {
    expect(headersFor('/assets/([^/]+)')['Cache-Control']).toContain('immutable');
    const models = headersFor('/assets/(medieval|modern|futurist)/(.*)')['Cache-Control'] ?? '';
    expect(models).not.toContain('immutable');
    expect(models).toContain('stale-while-revalidate');
  });
});
