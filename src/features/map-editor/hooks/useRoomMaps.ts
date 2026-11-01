import { useCallback, useEffect, useRef, useState } from 'react';
import { reportError } from '@/lib/report-error';
import { useMapEditorServices } from '../services/services-context';
import type { MapSummary, RoomChange } from '../types';

/** Junta rajadas de avisos (ex: reordenar mexe em vários mapas) numa recarga só. */
const REFRESH_DEBOUNCE_MS = 150;

export type RoomMapsState = {
  status: 'loading' | 'ready' | 'error';
  activeMapId: string | null;
  maps: MapSummary[];
  /** Conta as gravações de cada mapa vistas pelo tempo real: muda = documento novo no banco. */
  revisions: Readonly<Record<string, number>>;
};

const INITIAL_STATE: RoomMapsState = {
  status: 'loading',
  activeMapId: null,
  maps: [],
  revisions: {},
};

/** Lista de mapas e mapa ativo da mesa, sempre em dia pelo tempo real. */
export function useRoomMaps(roomId: string) {
  const { maps: service } = useMapEditorServices();
  const [state, setState] = useState<RoomMapsState>(INITIAL_STATE);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Encadeado com .then (e não await) para o estado só mudar quando a resposta chegar.
  const reload = useCallback(
    () =>
      service
        .loadRoomMaps(roomId)
        .then((snapshot) => setState((current) => ({ ...current, status: 'ready', ...snapshot })))
        .catch((error: unknown) => {
          reportError(error, {
            userMessage: 'Não conseguimos carregar os mapas da mesa.',
            context: { feature: 'map-editor', action: 'load-room-maps' },
            toast: false,
          });
          setState((current) =>
            current.status === 'ready' ? current : { ...current, status: 'error' },
          );
        }),
    [service, roomId],
  );

  const retry = useCallback(() => {
    setState(INITIAL_STATE);
    void reload();
  }, [reload]);

  useEffect(() => {
    void reload();
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void reload(), REFRESH_DEBOUNCE_MS);
    };
    const onChange = (change: RoomChange) => {
      if (change.type === 'map' && change.event === 'UPDATE') {
        const { mapId } = change;
        setState((current) => ({
          ...current,
          revisions: { ...current.revisions, [mapId]: (current.revisions[mapId] ?? 0) + 1 },
        }));
      }
      scheduleRefresh();
    };
    const unsubscribe = service.subscribeRoom(roomId, onChange);
    return () => {
      unsubscribe();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [service, roomId, reload]);

  /** Atualização otimista: o mestre vê a troca na hora, sem esperar o eco do tempo real. */
  const patch = useCallback((update: Partial<Pick<RoomMapsState, 'activeMapId' | 'maps'>>) => {
    setState((current) => ({ ...current, ...update }));
  }, []);

  return { ...state, reload, retry, patch };
}
