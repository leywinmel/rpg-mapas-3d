import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/cinzel/700.css';
import { App } from '@/app/App';
import { initTheme } from '@/lib/theme';
import { logger } from '@/lib/logger';
import '@/styles/global.css';

initTheme();

// Erros fora do React (promessas esquecidas) também vão para o log.
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Promessa rejeitada sem tratamento.', undefined, event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado no index.html.');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
