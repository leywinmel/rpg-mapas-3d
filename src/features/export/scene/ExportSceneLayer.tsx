import { lazy, Suspense } from 'react';

// A ponte com a cena usa three.js: só baixa quando a cena abre.
const ExportSceneBridge = lazy(() => import('./ExportSceneBridge'));

/** Camada da exportação na cena 3D (não desenha nada; liga o painel "Exportar" à cena). */
export function ExportSceneLayer() {
  return (
    <Suspense fallback={null}>
      <ExportSceneBridge />
    </Suspense>
  );
}
