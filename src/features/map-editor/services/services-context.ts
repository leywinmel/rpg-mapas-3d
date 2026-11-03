import { createContext, useContext } from 'react';
import { getSupabase } from '@/lib/supabase';
import { createSupabaseAssetsService, type AssetsService } from './assets-service';
import { createSupabaseMapsV2Service, type MapsV2Service } from './map-v2-service';
import { createSupabaseMapsService, type MapsService } from './maps-service';

/** `maps` cuida da lista da mesa; `mapsV2`, do conteúdo do mapa (cabeçalho e pedaços). */
export type MapEditorServices = { maps: MapsService; mapsV2: MapsV2Service; assets: AssetsService };

export const ServicesContext = createContext<MapEditorServices | null>(null);

let defaultServices: MapEditorServices | null = null;

/** Serviços reais, criados só no primeiro uso (o teste nunca chega aqui). */
function getDefaultServices(): MapEditorServices {
  if (defaultServices) return defaultServices;
  const client = getSupabase();
  defaultServices = {
    maps: createSupabaseMapsService(client),
    mapsV2: createSupabaseMapsV2Service(client),
    assets: createSupabaseAssetsService(client),
  };
  return defaultServices;
}

export function useMapEditorServices(): MapEditorServices {
  return useContext(ServicesContext) ?? getDefaultServices();
}
