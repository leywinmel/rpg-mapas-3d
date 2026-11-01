import type { ReactNode } from 'react';
import { ServicesContext, type MapEditorServices } from './services-context';

/** Troca os serviços do editor (nos testes, versões falsas em memória). */
export function MapEditorServicesProvider({
  services,
  children,
}: {
  services: MapEditorServices;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
