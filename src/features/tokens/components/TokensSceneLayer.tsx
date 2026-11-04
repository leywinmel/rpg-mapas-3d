import { lazy, Suspense } from 'react';

// three.js e a camada dos tokens só baixam quando a cena abre.
const TokensLayer = lazy(() => import('../scene/TokensLayer'));

/**
 * Camada dos tokens na cena. Vive dentro do Canvas: falha aqui cai no ErrorBoundary da cena
 * (um aviso de DOM não caberia dentro do three.js).
 */
export function TokensSceneLayer() {
  return (
    <Suspense fallback={null}>
      <TokensLayer />
    </Suspense>
  );
}
