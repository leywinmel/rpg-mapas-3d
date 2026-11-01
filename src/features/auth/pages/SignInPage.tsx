import { useId, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { LoadingState } from '@/components';
import { AuthCard } from '../components/AuthCard';
import { ForgotPasswordDialog } from '../components/ForgotPasswordDialog';
import { FormNotice } from '../components/FormNotice';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { SignInForm } from '../components/SignInForm';
import { SignUpForm } from '../components/SignUpForm';
import styles from '../components/auth.module.css';
import { useSession } from '../hooks/useSession';
import { AUTH_PATHS, RETURN_PARAM, TAB_PARAM } from '../paths';
import { absoluteAppUrl, parseReturnPath } from '../return-path';
import { parseAuthTab } from '../schemas';
import type { AuthTab } from '../types';

const TAB_LABELS: Record<AuthTab, string> = { entrar: 'Entrar', criar: 'Criar conta' };
const TAB_ORDER: AuthTab[] = ['entrar', 'criar'];

/** /entrar — login e cadastro. Depois de entrar, volta para onde a pessoa estava (?voltar=). */
export default function SignInPage() {
  const [params, setParams] = useSearchParams();
  const session = useSession();
  const [forgotOpen, setForgotOpen] = useState(false);
  const panelId = useId();
  const returnTo = parseReturnPath(params.get(RETURN_PARAM));
  const tab = parseAuthTab(params.get(TAB_PARAM));

  if (session.status === 'loading') return <LoadingState fill label="Verificando sua sessão…" />;
  if (session.status === 'signed-in' && !session.isGuest) return <Navigate to={returnTo} replace />;

  function selectTab(next: AuthTab) {
    const nextParams = new URLSearchParams(params);
    nextParams.set(TAB_PARAM, next);
    setParams(nextParams, { replace: true });
  }

  const returnUrl = absoluteAppUrl(returnTo);

  return (
    <AuthCard title={tab === 'entrar' ? 'Entre para abrir suas mesas' : 'Crie sua conta de mestre'}>
      <div role="tablist" aria-label="Entrar ou criar conta" className={styles.tabs}>
        {TAB_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            id={`${panelId}-${item}`}
            aria-selected={tab === item}
            aria-controls={panelId}
            className={styles.tab}
            onClick={() => selectTab(item)}
          >
            {TAB_LABELS[item]}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${panelId}-${tab}`}
        className={styles.form}
      >
        {session.isGuest && (
          <FormNotice tone="info">
            Você está como convidado. Ao entrar com uma conta, as mesas em que entrou como convidado
            ficam só com o convidado.
          </FormNotice>
        )}
        {tab === 'entrar' ? (
          <SignInForm onForgotPassword={() => setForgotOpen(true)} />
        ) : (
          <SignUpForm redirectTo={returnUrl} />
        )}
        <div className={styles.divider}>ou</div>
        <GoogleSignInButton redirectTo={returnUrl} />
      </div>
      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        redirectTo={absoluteAppUrl(AUTH_PATHS.resetPassword)}
      />
    </AuthCard>
  );
}
