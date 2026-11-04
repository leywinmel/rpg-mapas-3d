import { lazy, Suspense } from 'react';

// three.js e o destaque da vez só baixam quando a cena abre.
const CurrentTurnLayer = lazy(() => import('../scene/CurrentTurnLayer'));

/** Destaque do token da vez na cena. Vive dentro do Canvas (falha cai no ErrorBoundary da cena). */
export function InitiativeSceneLayer() {
  return (
    <Suspense fallback={null}>
      <CurrentTurnLayer />
    </Suspense>
  );
}
