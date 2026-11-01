import { Dices } from 'lucide-react';
import { ButtonLink, ErrorState, ThemeToggle } from '@/components';
import { envResult } from '@/lib/env';
import styles from './LobbyPage.module.css';

/** Tela inicial. Criar e entrar em salas chega na fatia de contas e salas. */
export function LobbyPage() {
  return (
    <main className={styles.lobby}>
      <div className={styles.corner}>
        <ThemeToggle />
      </div>
      <section className={styles.hero}>
        <h1 className={`brand ${styles.title}`}>rpgmaps</h1>
        <p className={styles.tagline}>
          Mesa de RPG online com mapas 3D em estilo diorama. Monte o cenário, chame os jogadores por
          link e role os dados na mesa.
        </p>
        {!envResult.ok && (
          <ErrorState title="Ambiente incompleto" description={envResult.problems.join(' ')} />
        )}
        <ButtonLink to="/sala/demo" size="lg" icon={<Dices size={20} />}>
          Abrir mesa de demonstração
        </ButtonLink>
      </section>
    </main>
  );
}
