/**
 * Traduz as falhas do Supabase Auth para português amigável. O detalhe técnico
 * vai só para o log (via reportError); a tela recebe a frase daqui.
 */

const HTTP_TOO_MANY_REQUESTS = 429;

export const AUTH_MESSAGES = {
  invalidCredentials: 'E-mail ou senha incorretos.',
  emailInUse: 'Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.',
  weakPassword: 'Essa senha é fraca demais. Use uma senha maior, misturando letras e números.',
  samePassword: 'A nova senha precisa ser diferente da atual.',
  rateLimited: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  emailNotConfirmed: 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  invalidEmail: 'Esse e-mail não parece válido.',
  signupDisabled: 'O cadastro de contas está fechado no momento.',
  providerDisabled: 'Esse jeito de entrar não está ativado no momento.',
  sessionExpired: 'Sua sessão expirou. Entre de novo.',
  linkExpired: 'O link expirou ou já foi usado. Peça um novo.',
  network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  unknown: 'Não deu para concluir agora. Tente de novo em instantes.',
} as const;

const MESSAGE_BY_CODE: Record<string, string> = {
  invalid_credentials: AUTH_MESSAGES.invalidCredentials,
  user_already_exists: AUTH_MESSAGES.emailInUse,
  email_exists: AUTH_MESSAGES.emailInUse,
  identity_already_exists: AUTH_MESSAGES.emailInUse,
  weak_password: AUTH_MESSAGES.weakPassword,
  same_password: AUTH_MESSAGES.samePassword,
  over_request_rate_limit: AUTH_MESSAGES.rateLimited,
  over_email_send_rate_limit: AUTH_MESSAGES.rateLimited,
  email_not_confirmed: AUTH_MESSAGES.emailNotConfirmed,
  email_address_invalid: AUTH_MESSAGES.invalidEmail,
  validation_failed: AUTH_MESSAGES.invalidEmail,
  signup_disabled: AUTH_MESSAGES.signupDisabled,
  email_provider_disabled: AUTH_MESSAGES.providerDisabled,
  provider_disabled: AUTH_MESSAGES.providerDisabled,
  anonymous_provider_disabled: AUTH_MESSAGES.providerDisabled,
  oauth_provider_not_supported: AUTH_MESSAGES.providerDisabled,
  session_not_found: AUTH_MESSAGES.sessionExpired,
  session_expired: AUTH_MESSAGES.sessionExpired,
  refresh_token_not_found: AUTH_MESSAGES.sessionExpired,
  otp_expired: AUTH_MESSAGES.linkExpired,
  flow_state_expired: AUTH_MESSAGES.linkExpired,
};

type ErrorShape = { code?: unknown; status?: unknown; name?: unknown; message?: unknown };

function readShape(error: unknown): ErrorShape {
  return error && typeof error === 'object' ? (error as ErrorShape) : {};
}

/** Versões antigas do Auth não mandam `code`; aí só sobra o texto em inglês. */
function messageFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('invalid login credentials')) return AUTH_MESSAGES.invalidCredentials;
  if (lower.includes('already registered')) return AUTH_MESSAGES.emailInUse;
  if (lower.includes('password should')) return AUTH_MESSAGES.weakPassword;
  if (lower.includes('rate limit')) return AUTH_MESSAGES.rateLimited;
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return AUTH_MESSAGES.network;
  }
  return null;
}

export function translateAuthError(error: unknown): string {
  const { code, status, name, message } = readShape(error);
  if (typeof code === 'string' && MESSAGE_BY_CODE[code]) return MESSAGE_BY_CODE[code];
  if (status === HTTP_TOO_MANY_REQUESTS) return AUTH_MESSAGES.rateLimited;
  if (name === 'AuthRetryableFetchError') return AUTH_MESSAGES.network;
  if (typeof message === 'string') return messageFromText(message) ?? AUTH_MESSAGES.unknown;
  return AUTH_MESSAGES.unknown;
}

/** Código para o log: ajuda a achar o caso sem gravar e-mail nem senha. */
export function authErrorCode(error: unknown): string {
  const { code, status } = readShape(error);
  if (typeof code === 'string') return code;
  return typeof status === 'number' ? `http_${status}` : 'unknown';
}
