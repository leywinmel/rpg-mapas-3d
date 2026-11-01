import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { LoadingState } from '@/components';
import { LobbyPage } from '@/features/rooms/pages/LobbyPage';
import { NotFoundPage } from './NotFoundPage';

// A cena 3D é pesada: só carrega quando alguém abre uma sala.
// Este arquivo é configuração de rotas, não componente de tela; recarga rápida não se aplica.
// eslint-disable-next-line react-refresh/only-export-components
const RoomPage = lazy(() => import('@/features/rooms/pages/RoomPage'));
// Vitrine dos componentes, só no modo de desenvolvimento (fica fora do site publicado).
// eslint-disable-next-line react-refresh/only-export-components
const ShowcasePage = lazy(() => import('./ShowcasePage'));

function withSuspense(node: ReactNode, label: string) {
  return <Suspense fallback={<LoadingState fill label={label} />}>{node}</Suspense>;
}

const routes: RouteObject[] = [
  { path: '/', element: <LobbyPage /> },
  { path: '/sala/:roomId', element: withSuspense(<RoomPage />, 'Carregando a mesa…') },
];

if (import.meta.env.DEV) {
  routes.push({ path: '/componentes', element: withSuspense(<ShowcasePage />, 'Carregando…') });
}

routes.push({ path: '*', element: <NotFoundPage /> });

export const router = createBrowserRouter(routes);
