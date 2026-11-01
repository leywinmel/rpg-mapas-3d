/** Mapa na lista da mesa (sem o documento, que pode ter centenas de KB). */
export type MapSummary = {
  id: string;
  name: string;
  width: number;
  depth: number;
  sortOrder: number;
  updatedAt: string;
};

/** Mapa completo. O documento chega como `unknown` e só vira MapDocument após o parse do domínio. */
export type MapRecord = MapSummary & { document: unknown };

export type RoomMaps = { activeMapId: string | null; maps: MapSummary[] };

/** Modelo .glb enviado pelo mestre (tabela map_assets). */
export type MapAsset = {
  id: string;
  name: string;
  storagePath: string;
  sizeBytes: number;
  createdAt: string;
};

/**
 * Aviso do tempo real. "resync" chega ao (re)conectar o canal: o que mudou
 * enquanto a conexão caiu não é reenviado, então a tela recarrega tudo.
 */
export type RoomChange =
  | { type: 'room' }
  | { type: 'resync' }
  | { type: 'map'; event: 'INSERT' | 'UPDATE' | 'DELETE'; mapId: string };
