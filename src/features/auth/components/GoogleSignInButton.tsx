import { useState } from 'react';
import { Button } from '@/components';
import { reportError } from '@/lib/report-error';
import { getAuthService } from '../services/auth-service';
import { reportAuthFailure } from '../services/report-auth-failure';
import { FormNotice, type NoticeTone } from './FormNotice';

const PROVIDER = 'google';

/** Entrar com Google. Se o servidor não tiver o Google ligado, avisa em vez de quebrar. */
export function GoogleSignInButton({ redirectTo }: { redirectTo: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: NoticeTone; text: string } | null>(null);

  async function isEnabled(): Promise<boolean> {
    try {
      return await getAuthService().isProviderEnabled(PROVIDER);
    } catch (error) {
      // Sem a resposta, tenta mesmo assim: o pior caso é o próprio Supabase recusar.
      reportError(error, {
        userMessage: 'Não deu para checar o login com Google.',
        context: { feature: 'auth', action: 'check-provider' },
        severity: 'warn',
        toast: false,
      });
      return true;
    }
  }

  async function handleClick() {
    setMessage(null);
    setPending(true);
    if (!(await isEnabled())) {
      setMessage({
        tone: 'info',
        text: 'O login com Google ainda não está ativado neste servidor. Use e-mail e senha.',
      });
      setPending(false);
      return;
    }
    try {
      // Daqui o navegador sai para o Google; o botão fica carregando até a página trocar.
      await getAuthService().signInWithOAuth(PROVIDER, redirectTo);
    } catch (error) {
      setMessage({ tone: 'error', text: reportAuthFailure(error, 'sign-in-google') });
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="secondary" block loading={pending} onClick={handleClick}>
        Entrar com Google
      </Button>
      {message && <FormNotice tone={message.tone}>{message.text}</FormNotice>}
    </>
  );
}
