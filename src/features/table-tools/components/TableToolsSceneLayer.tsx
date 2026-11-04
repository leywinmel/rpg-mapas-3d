import { lazy, Suspense } from 'react';

// three.js e a camada da régua e do ping só baixam quando a cena abre.
const TableToolsLayer = lazy(() => import('../scene/TableToolsLayer'));

/** Camada da régua e do ping na cena. Vive dentro do Canvas (falha cai no ErrorBoundary da cena). */
export function TableToolsSceneLayer() {
  return (
    <Suspense fallback={null}>
      <TableToolsLayer />
    </Suspense>
  );
}
