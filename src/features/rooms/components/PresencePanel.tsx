import { Users } from 'lucide-react';
import { Avatar, ErrorState, LoadingState, Panel } from '@/components';
import { cx } from '@/lib/cx';
import { useRoomControls, useRoomSession } from '../hooks/room-session-context';
import { roomErrorMessage } from '../services/room-errors';
import { sortMembers } from '../services/sort-members';
import { ROLE_LABELS, type RoomMember } from '../types';
import styles from './rooms.module.css';

function MemberRow({
  member,
  online,
  isSelf,
}: {
  member: RoomMember;
  online: boolean;
  isSelf: boolean;
}) {
  const isGm = member.role === 'gm';
  return (
    <li className={cx(styles.member, online && styles.memberOnline)}>
      <Avatar nickname={member.nickname} seed={member.userId} size="sm" isGameMaster={isGm} />
      <span className={styles.memberInfo}>
        <span className={styles.memberName}>
          {member.nickname}
          {isSelf && ' (você)'}
        </span>
        <span className={styles.memberStatus}>
          <span className={cx(styles.dot, online && styles.dotOnline)} aria-hidden="true" />
          {ROLE_LABELS[member.role]} · {online ? 'online' : 'offline'}
        </span>
      </span>
    </li>
  );
}

/** Quem é da mesa e quem está com ela aberta agora. */
export function PresencePanel({ onClose }: { onClose: () => void }) {
  const { onlineUserIds, viewer } = useRoomSession();
  const { membersState, reloadMembers } = useRoomControls();

  function renderBody() {
    if (membersState.status === 'loading') return <LoadingState label="Carregando membros…" />;
    if (membersState.status === 'error') {
      return (
        <ErrorState
          title="Lista indisponível"
          description={roomErrorMessage(membersState.error)}
          onRetry={reloadMembers}
        />
      );
    }
    return (
      <ul className={styles.memberList}>
        {sortMembers(membersState.data, onlineUserIds).map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            online={onlineUserIds.has(member.userId)}
            isSelf={member.userId === viewer.userId}
          />
        ))}
      </ul>
    );
  }

  const onlineCount =
    membersState.status === 'ready'
      ? membersState.data.filter((member) => onlineUserIds.has(member.userId)).length
      : 0;

  return (
    <Panel
      title={`Na mesa · ${onlineCount} online`}
      icon={<Users size={16} />}
      onClose={onClose}
      className={styles.presencePanel}
    >
      {renderBody()}
    </Panel>
  );
}
