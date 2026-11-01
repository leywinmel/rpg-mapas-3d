import { DoorOpen } from 'lucide-react';
import { ButtonLink } from '@/components';
import type { JoinResult } from '../hooks/useRoomEntry';
import { LOBBY_PATH } from '../paths';
import { NicknameForm } from './NicknameForm';
import styles from './rooms.module.css';

export type JoinRoomScreenProps = {
  roomName: string;
  defaultNickname?: string;
  onJoin: (nickname: string) => Promise<JoinResult>;
};

/** Quem já fez login mas ainda não é membro: só falta o apelido. */
export function JoinRoomScreen({ roomName, defaultNickname, onJoin }: JoinRoomScreenProps) {
  return (
    <main className="page page--center">
      <section className={styles.entryCard} aria-labelledby="room-join-title">
        <header className={styles.entryHeader}>
          <p className={styles.entryKicker}>Entrar na mesa</p>
          <h1 id="room-join-title" className={styles.entryTitle}>
            {roomName}
          </h1>
        </header>
        <NicknameForm
          submitLabel="Entrar na mesa"
          icon={<DoorOpen size={16} />}
          defaultValue={defaultNickname}
          onSubmit={onJoin}
        />
        <ButtonLink to={LOBBY_PATH} variant="ghost" block>
          Agora não
        </ButtonLink>
      </section>
    </main>
  );
}
