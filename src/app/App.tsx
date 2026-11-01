import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary, ToastViewport } from '@/components';
import { AuthProvider } from '@/features/auth';
import { router } from './router';

export function App() {
  return (
    <>
      <ErrorBoundary area="esta página" fill>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ErrorBoundary>
      <ToastViewport />
    </>
  );
}
