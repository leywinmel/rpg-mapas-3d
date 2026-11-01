import { createContext, useContext } from 'react';
import { getSupabase } from '@/lib/supabase';
import { createSupabaseAssetsService, type AssetsService } from './assets-service';
import { createSupabaseMapsService, type MapsService } from './maps-service';

export type MapEditorServices = { maps: MapsService; assets: AssetsService };

export const ServicesContext = createContext<MapEditorServices | null>(null);

let defaultServices: MapEditorServices | null = null;

/** Serviços reais, criados só no primeiro uso (o teste nunca chega aqui). */
function getDefaultServices(): MapEditorServices {
  if (defaultServices) return defaultServices;
  const client = getSupabase();
  defaultServices = {
    maps: createSupabaseMapsService(client),
    assets: createSupabaseAssetsService(client),
  };
  return defaultServices;
}

export function useMapEditorServices(): MapEditorServices {
  return useContext(ServicesContext) ?? getDefaultServices();
}
