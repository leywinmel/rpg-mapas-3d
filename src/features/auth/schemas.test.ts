import { validateForm } from '@/lib/validation';
import {
  newPasswordSchema,
  parseAuthTab,
  profileSchema,
  signInSchema,
  signUpSchema,
} from './schemas';

describe('signUpSchema', () => {
  it('shouldAcceptValidFormAndTrimText', () => {
    const result = validateForm(signUpSchema, {
      displayName: '  Theo  ',
      email: ' theo@exemplo.test ',
      password: 'segredo1',
    });
    expect(result).toEqual({
      ok: true,
      data: { displayName: 'Theo', email: 'theo@exemplo.test', password: 'segredo1' },
    });
  });

  it('shouldReportEachInvalidFieldInPortuguese', () => {
    const result = validateForm(signUpSchema, {
      displayName: '   ',
      email: 'theo',
      password: '123',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.displayName).toBe('Escolha um nome de exibição.');
    expect(result.errors.email).toBe('Esse e-mail não parece válido.');
    expect(result.errors.password).toMatch(/pelo menos 6/);
  });

  it('shouldRejectDisplayNameLongerThan40Characters', () => {
    const result = validateForm(profileSchema, { displayName: 'a'.repeat(41) });
    expect(result.ok).toBe(false);
  });
});

describe('signInSchema', () => {
  it('shouldAskForMissingEmailAndPassword', () => {
    const result = validateForm(signInSchema, { email: '', password: '' });
    expect(result).toEqual({
      ok: false,
      errors: { email: 'Informe seu e-mail.', password: 'Informe sua senha.' },
    });
  });
});

describe('newPasswordSchema', () => {
  it('shouldFlagConfirmationWhenPasswordsDiffer', () => {
    const result = validateForm(newPasswordSchema, {
      password: 'segredo1',
      confirmation: 'outra1',
    });
    expect(result).toEqual({ ok: false, errors: { confirmation: 'As senhas não são iguais.' } });
  });
});

describe('parseAuthTab', () => {
  it('shouldFallBackToSignInForUnknownTabs', () => {
    expect(parseAuthTab('criar')).toBe('criar');
    expect(parseAuthTab('admin')).toBe('entrar');
    expect(parseAuthTab(null)).toBe('entrar');
  });
});
