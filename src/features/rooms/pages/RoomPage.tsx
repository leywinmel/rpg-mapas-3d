import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ButtonLink, ErrorBoundary, ThemeToggle } from '@/components';
import { DioramaPreview } from '@/features/scene/components/DioramaPreview';

export default function RoomPage() {
  const { roomId } = useParams();
  return (
    <main className="room">
      <ErrorBoundary area="a cena 3D" fill>
        <DioramaPreview />
      </ErrorBoundary>
      <div className="room__hud">
        <ButtonLink to="/" variant="secondary" size="sm" icon={<ArrowLeft size={16} />}>
          Mesa: {roomId}
        </ButtonLink>
        <ThemeToggle />
      </div>
    </main>
  );
}
