import { LogIn, UserRound } from 'lucide-react';
import { ButtonLink } from '@/components';
import type { JoinResult } from '../hooks/useRoomEntry';
import { NicknameForm } from './NicknameForm';
import styles from './rooms.module.css';

export type RoomEntryScreenProps = {
  /** Nulo quando o servidor só mostra o nome para quem já fez login. */
  roomName: string | null;
  /** Tela de entrar que volta para esta sala depois do login. */
  signInHref: string;
  onJoinAsGuest: (nickname: string) => Promise<JoinResult>;
};

/** Convite aberto por quem ainda não fez login: entrar como convidado ou com a própria conta. */
export function RoomEntryScreen({ roomName, signInHref, onJoinAsGuest }: RoomEntryScreenProps) {
  return (
    <main className="page page--center">
      <section className={styles.entryCard} aria-labelledby="room-entry-title">
        <header className={styles.entryHeader}>
          <p className={styles.entryKicker}>Você foi convidado para a mesa</p>
          <h1 id="room-entry-title" className={styles.entryTitle}>
            {roomName ?? 'Mesa de RPG'}
          </h1>
        </header>
        <NicknameForm
          submitLabel="Entrar como convidado"
          icon={<UserRound size={16} />}
          onSubmit={onJoinAsGuest}
        />
        <div className={styles.divider}>ou</div>
        <ButtonLink to={signInHref} variant="secondary" block icon={<LogIn size={16} />}>
          Entrar com minha conta
        </ButtonLink>
        <p className={styles.muted}>
          Com conta, você guarda as anotações que o mestre mandar e volta à mesa de qualquer lugar.
        </p>
      </section>
    </main>
  );
}
