import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { LobbyPage } from '@/features/rooms/pages/LobbyPage';
import { NotFoundPage } from './NotFoundPage';

// A cena 3D é pesada: só carrega quando alguém abre uma sala.
// Este arquivo é configuração de rotas, não componente de tela; recarga rápida não se aplica.
// eslint-disable-next-line react-refresh/only-export-components
const RoomPage = lazy(() => import('@/features/rooms/pages/RoomPage'));

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<p className="loading">Carregando a mesa…</p>}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <LobbyPage /> },
  { path: '/sala/:roomId', element: withSuspense(<RoomPage />) },
  { path: '*', element: <NotFoundPage /> },
]);
