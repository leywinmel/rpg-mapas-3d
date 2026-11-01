import { useParams } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { ButtonLink, EmptyState, ErrorBoundary, ErrorState, LoadingState } from '@/components';
import { signInPath, useSession } from '@/features/auth';
import { DioramaPreview } from '@/features/scene/components/DioramaPreview';
import { JoinRoomScreen } from '../components/JoinRoomScreen';
import { RoomEntryScreen } from '../components/RoomEntryScreen';
import { RoomHud } from '../components/RoomHud';
import { RoomSessionProvider } from '../components/RoomSessionProvider';
import { useRoomEntry } from '../hooks/useRoomEntry';
import { LOBBY_PATH, roomPath } from '../paths';
import { roomErrorMessage } from '../services/room-errors';

function RoomNotFound() {
  return (
    <main className="page page--center">
      <EmptyState
        icon={<MapPinOff size={22} />}
        title="Mesa não encontrada"
        description="O link está errado ou a mesa foi apagada. Peça um convite novo ao mestre."
        action={<ButtonLink to={LOBBY_PATH}>Voltar ao início</ButtonLink>}
      />
    </main>
  );
}

/** /sala/:slug — entrada pelo link de convite e, para membros, a mesa em si. */
export default function RoomPage() {
  const { slug: rawSlug } = useParams();
  const session = useSession();
  const { slug, state, reload, joinAsGuest, joinAsMember } = useRoomEntry(rawSlug);

  if (state.status === 'loading') return <LoadingState fill label="Abrindo a mesa…" />;
  if (state.status === 'error') {
    return (
      <main className="page page--center">
        <ErrorState
          title="Não deu para abrir a mesa"
          description={roomErrorMessage(state.error)}
          onRetry={reload}
        />
      </main>
    );
  }

  const entry = state.data;
  if (entry.status === 'not-found' || !slug) return <RoomNotFound />;
  if (entry.status === 'needs-identity') {
    return (
      <RoomEntryScreen
        roomName={entry.preview?.name ?? null}
        signInHref={signInPath(roomPath(slug))}
        onJoinAsGuest={joinAsGuest}
      />
    );
  }
  if (entry.status === 'needs-nickname') {
    return (
      <JoinRoomScreen
        roomName={entry.preview.name}
        defaultNickname={session.profile?.displayName}
        onJoin={joinAsMember}
      />
    );
  }
  if (!session.user) return <LoadingState fill label="Abrindo a mesa…" />;

  return (
    <RoomSessionProvider
      key={entry.room.id}
      room={entry.room}
      membership={entry.membership}
      user={session.user}
    >
      <main className="room">
        <ErrorBoundary area="a cena 3D" fill>
          <DioramaPreview />
        </ErrorBoundary>
        <RoomHud />
      </main>
    </RoomSessionProvider>
  );
}
