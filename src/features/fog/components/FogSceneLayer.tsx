import { lazy, Suspense } from 'react';

// A camada da névoa só baixa quando a cena abre.
const FogLayer = lazy(() => import('../scene/FogLayer'));

/** Camada da névoa na cena. Vive dentro do Canvas, como a dos tokens. */
export function FogSceneLayer() {
  return (
    <Suspense fallback={null}>
      <FogLayer />
    </Suspense>
  );
}
