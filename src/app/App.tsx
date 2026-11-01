import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary, ToastViewport } from '@/components';
import { router } from './router';

export function App() {
  return (
    <>
      <ErrorBoundary area="esta página" fill>
        <RouterProvider router={router} />
      </ErrorBoundary>
      <ToastViewport />
    </>
  );
}
