import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AUTH_PATHS } from '../paths';
import styles from './auth.module.css';

/** Moldura das telas de conta: marca no topo (volta ao início) e o conteúdo num cartão. */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby={titleId}>
        <header className={styles.cardHeader}>
          <Link to={AUTH_PATHS.home} className={`brand ${styles.brandLink}`}>
            rpgmaps
          </Link>
          <h1 id={titleId} className={styles.subtitle}>
            {title}
          </h1>
        </header>
        {children}
      </section>
    </main>
  );
}
