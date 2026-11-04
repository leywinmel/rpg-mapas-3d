import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Plus, UserPlus } from 'lucide-react';
import { Button, ButtonLink, ErrorState, LoadingState, ThemeToggle } from '@/components';
import { canCreateRoom } from '@/domain';
import { AccountMenu, FormNotice, signInPath, useSession, type Session } from '@/features/auth';
import { CREDITS_PATH } from '@/features/credits';
import { envResult } from '@/lib/env';
import { CreateRoomDialog } from '../components/CreateRoomDialog';
import { JoinByLinkForm } from '../components/JoinByLinkForm';
import { MyRoomsList } from '../components/MyRoomsList';
import { LOBBY_PATH } from '../paths';
import styles from '../components/rooms.module.css';

function Topbar({ signedIn }: { signedIn: boolean }) {
  return (
    <header className={styles.topbar}>
      {/* Sem login, o nome grande já está no centro da tela. */}
      {signedIn ? (
        <Link to={LOBBY_PATH} className={`brand ${styles.topbarBrand}`}>
          rpgmaps
        </Link>
      ) : (
        <span />
      )}
      <div className={styles.topbarActions}>
        <ThemeToggle />
        {signedIn && <AccountMenu />}
      </div>
    </header>
  );
}

/** Apresentação para quem ainda não entrou. */
function Welcome() {
  return (
    <section className={styles.hero}>
      <h1 className={`brand ${styles.heroTitle}`}>rpgmaps</h1>
      <p className={styles.tagline}>
        Mesa de RPG online com mapas 3D em estilo diorama. Monte o cenário, chame os jogadores por
        link e role os dados na mesa.
      </p>
      {!envResult.ok && (
        <ErrorState title="Ambiente incompleto" description={envResult.problems.join(' ')} />
      )}
      <div className={styles.heroActions}>
        <ButtonLink to={signInPath()} size="lg" icon={<LogIn size={20} />}>
          Entrar
        </ButtonLink>
        <ButtonLink
          to={signInPath(undefined, 'criar')}
          size="lg"
          variant="secondary"
          icon={<UserPlus size={20} />}
        >
          Criar conta
        </ButtonLink>
      </div>
      <p className={styles.muted}>Recebeu um link de convite? Abra o link para entrar na mesa.</p>
    </section>
  );
}

/** Mesas de quem já entrou: com conta cria mesas; convidado só entra pelas que recebeu. */
function Dashboard({ session, userId }: { session: Session; userId: string }) {
  const [creating, setCreating] = useState(false);
  const mayCreate = canCreateRoom({ isGuest: session.isGuest });

  return (
    <div className={styles.content}>
      <section className={styles.section} aria-labelledby="my-rooms-title">
        <div className={styles.sectionHeader}>
          <h2 id="my-rooms-title" className={styles.sectionTitle}>
            Minhas mesas
          </h2>
          {mayCreate && (
            <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              Criar mesa
            </Button>
          )}
        </div>
        {!mayCreate && (
          <FormNotice tone="info">
            Você está como convidado. Para criar a sua própria mesa,{' '}
            <Link to={signInPath(LOBBY_PATH, 'criar')}>crie uma conta</Link> grátis.
          </FormNotice>
        )}
        <MyRoomsList
          userId={userId}
          emptyHint={
            mayCreate
              ? 'Crie uma mesa para começar ou entre com o link que um mestre te mandou.'
              : 'Entre com o link que o mestre te mandou.'
          }
        />
      </section>
      <section className={styles.section} aria-labelledby="join-title">
        <h2 id="join-title" className={styles.sectionTitle}>
          Entrar com link ou código
        </h2>
        <JoinByLinkForm />
      </section>
      {mayCreate && (
        <CreateRoomDialog
          open={creating}
          onClose={() => setCreating(false)}
          defaultNickname={session.profile?.displayName}
        />
      )}
    </div>
  );
}

/** Tela inicial: apresentação (sem login) ou as mesas da pessoa. */
export function LobbyPage() {
  const session = useSession();

  if (session.status === 'loading') return <LoadingState fill label="Carregando…" />;

  return (
    <main className={styles.lobby}>
      <Topbar signedIn={session.user !== null} />
      {session.user ? <Dashboard session={session} userId={session.user.id} /> : <Welcome />}
      <footer className={styles.footer}>
        <Link to={CREDITS_PATH}>Créditos dos modelos 3D</Link>
      </footer>
    </main>
  );
}
