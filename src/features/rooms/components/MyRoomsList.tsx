import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Castle, Trash2 } from 'lucide-react';
import { Avatar, EmptyState, ErrorState, IconButton, LoadingState } from '@/components';
import { cx } from '@/lib/cx';
import { useMyRooms } from '../hooks/useMyRooms';
import { roomPath } from '../paths';
import { roomErrorMessage } from '../services/room-errors';
import { ROLE_LABELS, type RoomSummary } from '../types';
import { ConfirmDeleteRoomDialog } from './RoomAdminDialogs';
import styles from './rooms.module.css';

/** Mesas em que a pessoa é mestre ou jogadora, das mais recentes para as mais antigas. */
export function MyRoomsList({ userId, emptyHint }: { userId: string; emptyHint: string }) {
  const rooms = useMyRooms(userId);
  const [deleting, setDeleting] = useState<RoomSummary | null>(null);

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
    <>
      <ul className={styles.roomList}>
        {rooms.data.map((room) => (
          <li key={room.id} className={styles.roomRow}>
            <Link to={roomPath(room.slug)} className={styles.roomLink}>
              <Avatar nickname={room.name} seed={room.id} size="sm" />
              <span className={styles.roomInfo}>
                <span className={styles.roomName}>{room.name}</span>
                <span className={styles.muted}>
                  {room.joined ? `Você é ${room.nickname}` : 'Admin: você ainda não entrou'}
                </span>
              </span>
              <span className={cx(styles.badge, room.role === 'gm' && styles.badgeGm)}>
                {ROLE_LABELS[room.role]}
              </span>
            </Link>
            {/* Fora do link: botão dentro de <a> é HTML inválido e o clique abriria a mesa. */}
            {room.ownedByMe && (
              <IconButton
                label={`Apagar a mesa ${room.name}`}
                icon={<Trash2 size={16} />}
                size="sm"
                className={styles.roomDelete}
                onClick={() => setDeleting(room)}
              />
            )}
          </li>
        ))}
      </ul>
      {deleting && (
        <ConfirmDeleteRoomDialog
          room={deleting}
          open
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            rooms.reload();
          }}
        />
      )}
    </>
  );
}
