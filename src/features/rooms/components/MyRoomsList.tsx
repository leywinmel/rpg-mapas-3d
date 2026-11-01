import { Link } from 'react-router-dom';
import { Castle } from 'lucide-react';
import { Avatar, EmptyState, ErrorState, LoadingState } from '@/components';
import { cx } from '@/lib/cx';
import { useMyRooms } from '../hooks/useMyRooms';
import { roomPath } from '../paths';
import { roomErrorMessage } from '../services/room-errors';
import { ROLE_LABELS } from '../types';
import styles from './rooms.module.css';

/** Mesas em que a pessoa é mestre ou jogadora, das mais recentes para as mais antigas. */
export function MyRoomsList({ userId, emptyHint }: { userId: string; emptyHint: string }) {
  const rooms = useMyRooms(userId);

  if (rooms.status === 'loading') return <LoadingState label="Carregando suas mesas…" />;
  if (rooms.status === 'error') {
    return (
      <ErrorState
        title="Não deu para carregar suas mesas"
        description={roomErrorMessage(rooms.error)}
        onRetry={rooms.reload}
      />
    );
  }
  if (rooms.data.length === 0) {
    return (
      <EmptyState
        icon={<Castle size={22} />}
        title="Nenhuma mesa por aqui ainda"
        description={emptyHint}
      />
    );
  }

  return (
    <ul className={styles.roomList}>
      {rooms.data.map((room) => (
        <li key={room.id}>
          <Link to={roomPath(room.slug)} className={styles.roomLink}>
            <Avatar nickname={room.name} seed={room.id} size="sm" />
            <span className={styles.roomInfo}>
              <span className={styles.roomName}>{room.name}</span>
              <span className={styles.muted}>Você é {room.nickname}</span>
            </span>
            <span className={cx(styles.badge, room.role === 'gm' && styles.badgeGm)}>
              {ROLE_LABELS[room.role]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
