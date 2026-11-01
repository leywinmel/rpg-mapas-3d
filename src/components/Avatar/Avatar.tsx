import type { CSSProperties } from 'react';
import { cx } from '@/lib/cx';
import { avatarColorIndex, initialsOf } from './avatar-utils';
import styles from './Avatar.module.css';

export type AvatarProps = {
  nickname: string;
  /** Id estável do usuário; sem ele, usa o apelido. */
  seed?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Marca o mestre com um anel cor de brasa. */
  isGameMaster?: boolean;
};

export function Avatar({ nickname, seed, size = 'md', isGameMaster }: AvatarProps) {
  const style = {
    '--avatar-color': `var(--avatar-${avatarColorIndex(seed ?? nickname)})`,
  } as CSSProperties;
  const label = isGameMaster ? `${nickname} (mestre)` : nickname;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cx(styles.avatar, size !== 'md' && styles[size], isGameMaster && styles.gm)}
      style={style}
    >
      <span aria-hidden="true">{initialsOf(nickname)}</span>
    </span>
  );
}
