import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notify } from '@/components';
import { reportError } from '@/lib/report-error';
import { AUTH_PATHS } from '../paths';
import { getAuthService } from '../services/auth-service';
import { translateAuthError } from '../services/auth-errors';

/** Sair da conta e voltar ao início, avisando o resultado. */
export function useSignOut() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await getAuthService().signOut();
      notify.info('Você saiu da conta.');
      navigate(AUTH_PATHS.home, { replace: true });
    } catch (error) {
      reportError(error, {
        userMessage: translateAuthError(error),
        context: { feature: 'auth', action: 'sign-out' },
      });
    } finally {
      setPending(false);
    }
  }

  return { signOut, pending };
}
