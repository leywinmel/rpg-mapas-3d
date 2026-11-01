/**
 * Página só de desenvolvimento (/dev/mapa/:roomId): entra com uma conta do
 * seed e monta a área do mapa, sem depender das telas de sala e login. Fica
 * fora do site publicado (a rota só existe com import.meta.env.DEV).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { LogOut } from 'lucide-react';
import { Button, ErrorState, LoadingState, Panel, TextField } from '@/components';
import type { PerfSample } from '@/features/scene/components/PerfMeter';
import { getSupabase } from '@/lib/supabase';
import { MapWorkspace } from '../components/MapWorkspace';
import styles from './DevMapPage.module.css';

const SEED_ACCOUNTS = [
  { label: 'Mestre de teste', email: 'mestre@rpgmaps.test' },
  { label: 'Jogador de teste', email: 'jogador@rpgmaps.test' },
] as const;

const GM_ROLE = 'gm';

type Role =
  { status: 'loading' } | { status: 'ready'; isGameMaster: boolean } | { status: 'error' };

function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const auth = getSupabase().auth;
    void auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

function useRole(roomId: string, userId: string): Role {
  const [role, setRole] = useState<Role>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    void getSupabase()
      .from('room_members')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setRole({ status: 'error' });
        else setRole({ status: 'ready', isGameMaster: data.role === GM_ROLE });
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, userId]);
  return role;
}

function LoginForm() {
  const [email, setEmail] = useState<string>(SEED_ACCOUNTS[0].email);
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFailure(null);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setFailure('E-mail ou senha não conferem (use uma conta do seed.sql).');
  };

  return (
    <div className={styles.center}>
      <Panel title="Entrar (desenvolvimento)">
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <div className={styles.accounts}>
            {SEED_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant={account.email === email ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setEmail(account.email)}
              >
                {account.label}
              </Button>
            ))}
          </div>
          <TextField
            label="E-mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            hint="A senha das contas de teste está no comentário do supabase/seed.sql."
            value={password}
            error={failure ?? undefined}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" loading={busy} block>
            Entrar
          </Button>
        </form>
      </Panel>
    </div>
  );
}

function PerfOverlay({ sample }: { sample: PerfSample | null }) {
  if (!sample) return null;
  return (
    <output className={styles.perf} aria-label="Desempenho da cena">
      {sample.fps.toFixed(0)} fps · {sample.frameMs.toFixed(1)} ms (pior{' '}
      {sample.worstFrameMs.toFixed(1)} ms) · {sample.drawCalls} draws ·{' '}
      {(sample.triangles / 1000).toFixed(0)}k tri
    </output>
  );
}

function Workspace({ roomId, session }: { roomId: string; session: Session }) {
  const role = useRole(roomId, session.user.id);
  const [sample, setSample] = useState<PerfSample | null>(null);
  return (
    <div className="room">
      <div className="room__hud">
        <span className={styles.who}>
          {role.status === 'ready' && (role.isGameMaster ? 'Mestre' : 'Jogador')} ·{' '}
          {session.user.email}
        </span>
        <Button
          variant="ghost"
          size="sm"
          icon={<LogOut size={14} />}
          onClick={() => void getSupabase().auth.signOut()}
        >
          Sair
        </Button>
      </div>
      {role.status === 'loading' && <LoadingState fill label="Conferindo o seu papel na mesa…" />}
      {role.status === 'error' && (
        <ErrorState
          fill
          title="Você não está nesta mesa"
          description="Entre com uma conta do seed que participa da mesa demo."
        />
      )}
      {role.status === 'ready' && (
        <MapWorkspace roomId={roomId} isGameMaster={role.isGameMaster} onPerfSample={setSample} />
      )}
      <PerfOverlay sample={sample} />
    </div>
  );
}

export default function DevMapPage() {
  const { roomId = '' } = useParams();
  const session = useSession();
  if (session === undefined) return <LoadingState fill label="Carregando…" />;
  if (!session) return <LoginForm />;
  return <Workspace key={session.user.id} roomId={roomId} session={session} />;
}
