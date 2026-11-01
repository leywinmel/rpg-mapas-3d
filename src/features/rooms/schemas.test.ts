import { validateForm } from '@/lib/validation';
import { createRoomSchema, parseInviteInput, parseRoomSlug } from './schemas';

describe('parseInviteInput', () => {
  it.each([
    ['abc123', 'abc123'],
    ['  ABC123  ', 'abc123'],
    ['http://localhost:5173/sala/demo', 'demo'],
    ['https://rpgmaps.example/sala/f00ba4c0de?ref=x#topo', 'f00ba4c0de'],
    ['/sala/demo/', 'demo'],
  ])('shouldExtractCodeFrom %s', (raw, expected) => {
    expect(parseInviteInput(raw)).toBe(expected);
  });

  it.each(['', 'https://site.test/', 'mesa com espaço', '<script>', '/sala/'])(
    'shouldRejectUnrecognizedInvite %s',
    (raw) => {
      expect(parseInviteInput(raw)).toBeNull();
    },
  );
});

describe('parseRoomSlug', () => {
  it('shouldRejectSlugsOutsideTheLinkFormat', () => {
    expect(parseRoomSlug('demo')).toBe('demo');
    expect(parseRoomSlug(undefined)).toBeNull();
    expect(parseRoomSlug('a'.repeat(65))).toBeNull();
    expect(parseRoomSlug('../etc')).toBeNull();
  });
});

describe('createRoomSchema', () => {
  it('shouldTrimAndAcceptValidRoom', () => {
    expect(validateForm(createRoomSchema, { name: '  Cripta ', nickname: ' Theo ' })).toEqual({
      ok: true,
      data: { name: 'Cripta', nickname: 'Theo' },
    });
  });

  it('shouldEnforceDatabaseLimits', () => {
    const result = validateForm(createRoomSchema, { name: 'x'.repeat(81), nickname: '' });
    expect(result).toEqual({
      ok: false,
      errors: { name: 'Use no máximo 80 caracteres.', nickname: 'Escolha um apelido.' },
    });
  });
});
