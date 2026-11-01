import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { LoadingState } from '@/components';
import { AUTH_PATHS } from '@/features/auth';
import { LobbyPage } from '@/features/rooms/pages/LobbyPage';
import { LOBBY_PATH, ROOM_ROUTE } from '@/features/rooms/paths';
import { NotFoundPage } from './NotFoundPage';

// Este arquivo é configuração de rotas, não componente de tela; recarga rápida não se aplica.
// A cena 3D é pesada: só carrega quando alguém abre uma sala.
// eslint-disable-next-line react-refresh/only-export-components
const RoomPage = lazy(() => import('@/features/rooms/pages/RoomPage'));
// Telas de conta saem da carga inicial: quem só abre um convite não paga por elas.
// eslint-disable-next-line react-refresh/only-export-components
const SignInPage = lazy(() => import('@/features/auth/pages/SignInPage'));
// eslint-disable-next-line react-refresh/only-export-components
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
// eslint-disable-next-line react-refresh/only-export-components
const ProfilePage = lazy(() => import('@/features/auth/pages/ProfilePage'));
// Vitrine dos componentes, só no modo de desenvolvimento (fica fora do site publicado).
// eslint-disable-next-line react-refresh/only-export-components
const ShowcasePage = lazy(() => import('./ShowcasePage'));

function withSuspense(node: ReactNode, label: string) {
  return <Suspense fallback={<LoadingState fill label={label} />}>{node}</Suspense>;
}

const routes: RouteObject[] = [
  { path: LOBBY_PATH, element: <LobbyPage /> },
  { path: AUTH_PATHS.signIn, element: withSuspense(<SignInPage />, 'Carregando…') },
  { path: AUTH_PATHS.resetPassword, element: withSuspense(<ResetPasswordPage />, 'Carregando…') },
  { path: AUTH_PATHS.profile, element: withSuspense(<ProfilePage />, 'Carregando…') },
  { path: ROOM_ROUTE, element: withSuspense(<RoomPage />, 'Carregando a mesa…') },
];

if (import.meta.env.DEV) {
  routes.push({ path: '/componentes', element: withSuspense(<ShowcasePage />, 'Carregando…') });
}

routes.push({ path: '*', element: <NotFoundPage /> });

export const router = createBrowserRouter(routes);
