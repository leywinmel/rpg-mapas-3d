import { useState } from 'react';
import { Box, Image, Plus, UserRound } from 'lucide-react';
import { Button, EmptyState, ErrorState, LoadingState, Panel } from '@/components';
import { isGameMaster } from '@/domain';
import { useRoomSession } from '@/features/rooms';
import { cx } from '@/lib/cx';
import { useSelectedToken, useTokensStore } from '../hooks/tokens-store';
import { toTokenError } from '../services/token-errors';
import type { Token } from '../types';
import { TokenDetails } from './TokenDetails';
import { TokenFormDialog } from './TokenFormDialog';
import styles from './tokens.module.css';

function ownerLabel(token: Token, viewerId: string, nicknames: ReadonlyMap<string, string>) {
  if (token.ownerId === null) return 'Do mestre';
  if (token.ownerId === viewerId) return 'Seu';
  return nicknames.get(token.ownerId) ?? 'Jogador';
}

function TokenRow({ token, selected, meta }: { token: Token; selected: boolean; meta: string }) {
  const hasHealth = token.hpMax !== null && token.hpCurrent !== null;
  return (
    <button
      type="button"
      className={cx(styles.row, selected && styles.rowSelected)}
      aria-pressed={selected}
      onClick={() => useTokensStore.getState().select(selected ? null : token.id)}
    >
      <span className={styles.swatch} aria-hidden>
        {token.kind === 'image' ? <Image size={14} /> : <Box size={14} />}
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowName}>{token.name}</span>
        <span className={styles.rowMeta}>
          {meta} · {token.size}×{token.size}
          {token.hidden && ' · escondido'}
        </span>
      </span>
      {hasHealth && (
        <span className={styles.hp}>
          {token.hpCurrent}/{token.hpMax}
        </span>
      )}
    </button>
  );
}

function TokensBody({ onCreate }: { onCreate: () => void }) {
  const { viewer, members } = useRoomSession();
  const status = useTokensStore((state) => state.status);
  const error = useTokensStore((state) => state.error);
  const tokens = useTokensStore((state) => state.tokens);
  const hasMap = useTokensStore((state) => state.view !== null);
  const selectedId = useTokensStore((state) => state.selectedId);
  const reload = useTokensStore((state) => state.actions?.reload);
  const master = isGameMaster(viewer);
  const nicknames = new Map(members.map((member) => [member.userId, member.nickname]));

  if (!hasMap) {
    return (
      <EmptyState
        icon={<UserRound size={22} />}
        title="Nenhum mapa aberto"
        description="Os tokens aparecem quando houver um mapa na tela."
      />
    );
  }
  if (status === 'error') {
    return (
      <ErrorState
        title="Não deu para carregar os tokens"
        description={toTokenError(error).message}
        onRetry={reload}
      />
    );
  }
  if (status !== 'ready') return <LoadingState label="Carregando os tokens…" />;
  if (tokens.length === 0) {
    return master ? (
      <EmptyState
        icon={<UserRound size={22} />}
        title="Nenhum token neste mapa"
        description="Crie personagens, monstros e NPCs. Cada um pode ter um jogador como dono."
        action={
          <Button icon={<Plus size={16} />} onClick={onCreate}>
            Criar o primeiro
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={<UserRound size={22} />}
        title="Nenhum token à vista"
        description="Quando o mestre puser tokens no mapa, eles aparecem aqui."
      />
    );
  }
  return (
    <ul className={styles.list}>
      {tokens.map((token) => (
        <li key={token.id}>
          <TokenRow
            token={token}
            selected={token.id === selectedId}
            meta={ownerLabel(token, viewer.userId, nicknames)}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Painel "Tokens" da sala: a lista do mapa aberto e os detalhes do escolhido. O mestre cria e
 * mexe em todos; o jogador mexe na vida, nas notas e na posição dos próprios.
 */
export function TokensPanel({ onClose }: { onClose: () => void }) {
  const { viewer } = useRoomSession();
  const selected = useSelectedToken();
  const hasMap = useTokensStore((state) => state.view !== null);
  const [form, setForm] = useState({ open: false, session: 0 });
  const openForm = () => setForm((current) => ({ open: true, session: current.session + 1 }));
  const master = isGameMaster(viewer);

  return (
    <Panel
      title="Tokens"
      icon={<UserRound size={18} />}
      onClose={onClose}
      className={styles.panel}
      actions={
        master &&
        hasMap && (
          <Button size="sm" icon={<Plus size={16} />} onClick={openForm}>
            Novo
          </Button>
        )
      }
    >
      <div className={styles.stack}>
        {selected && <TokenDetails key={selected.id} token={selected} />}
        <TokensBody onCreate={openForm} />
      </div>
      {master && (
        <TokenFormDialog
          key={form.session}
          open={form.open}
          onClose={() => setForm((current) => ({ ...current, open: false }))}
        />
      )}
    </Panel>
  );
}
