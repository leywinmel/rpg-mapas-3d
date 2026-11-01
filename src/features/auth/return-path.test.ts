import { parseReturnPath, signInPath } from './return-path';

describe('parseReturnPath', () => {
  it.each(['/sala/demo', '/perfil', '/sala/abc123?x=1#y'])('shouldKeepInternalPath %s', (path) => {
    expect(parseReturnPath(path)).toBe(path);
  });

  it.each([
    null,
    '',
    'sala/demo',
    'https://malicioso.test',
    '//malicioso.test',
    '/\\malicioso.test',
    '/sala/ demo',
    '/redirect?to=https://malicioso.test',
    'javascript:alert(1)',
    `/${'a'.repeat(400)}`,
  ])('shouldSendSuspiciousValueHome %s', (raw) => {
    expect(parseReturnPath(raw)).toBe('/');
  });
});

describe('signInPath', () => {
  it('shouldEncodeReturnPathAndTab', () => {
    expect(signInPath('/sala/demo')).toBe('/entrar?voltar=%2Fsala%2Fdemo');
    expect(signInPath(undefined, 'criar')).toBe('/entrar?aba=criar');
    expect(signInPath('/')).toBe('/entrar');
  });
});
