import { useParams } from 'react-router-dom';
import { DioramaPreview } from '@/features/scene/components/DioramaPreview';

export default function RoomPage() {
  const { roomId } = useParams();
  return (
    <main className="room">
      <header className="room__bar">
        <span>Sala: {roomId}</span>
      </header>
      <DioramaPreview />
    </main>
  );
}
