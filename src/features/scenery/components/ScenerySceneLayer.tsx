import { lazy, Suspense } from 'react';

// A camada do cenário em movimento só baixa quando a cena abre.
const SceneryGlides = lazy(() => import('../scene/SceneryGlides'));

/** Peças do cenário deslizando até o lugar novo. Vive dentro do Canvas, como a dos tokens. */
export function ScenerySceneLayer() {
  return (
    <Suspense fallback={null}>
      <SceneryGlides />
    </Suspense>
  );
}
