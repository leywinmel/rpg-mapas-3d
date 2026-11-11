import { useCallback, useEffect, useMemo } from 'react';
import { DEFAULT_TABLE_WEATHER } from '@/domain';
import type { Cutaway } from '@/domain/map-v2';
import { MapWorkspace, type MapView, type TableBinding } from '@/features/map-editor';
import { ExportSceneLayer } from '@/features/export';
import { FogSceneLayer, FogSync, useFogStore } from '@/features/fog';
import { InitiativeSceneLayer, InitiativeSync } from '@/features/initiative';
import {
  receivePieceMoved,
  ScenerySceneLayer,
  ScenerySync,
  useSceneryAdjuster,
} from '@/features/scenery';
import { useWeatherStore } from '@/features/scene';
import { TableToolsSceneLayer, TableToolsSync } from '@/features/table-tools';
import { TokensSceneLayer, TokensSync, useTokensStore } from '@/features/tokens';
import { useRoomControls, useRoomSession } from '../hooks/room-session-context';
import { getRoomsService } from '../services/rooms-service';

/**
 * Mapa da mesa aberta. O papel vem da sessão da sala, que acompanha mudanças
 * em tempo real; o banco (RLS) continua sendo quem decide no fim.
 */
/** O mapa na tela vai para os tokens (fora do React: a cena e o painel leem o mesmo estado). */
function showView(view: MapView | null) {
  useTokensStore.getState().setView(view);
}

const SCENE_LAYER = (
  <>
    <TokensSceneLayer />
    <ScenerySceneLayer />
    <FogSceneLayer />
    <TableToolsSceneLayer />
    <InitiativeSceneLayer />
    <ExportSceneLayer />
  </>
);

export function RoomMap() {
  const { room, isGameMaster } = useRoomSession();
  const { replaceRoom } = useRoomControls();
  const roomId = room.id;
  // Mudou a névoa: o jogador relê o mapa (o banco só manda o que está descoberto).
  const fogRevision = useFogStore((state) => state.revision);
  // O carro que o mestre moveu desliza na cena; o pedaço do mapa não o desenha enquanto isso.
  const adjustModel = useSceneryAdjuster();
  const table = useMemo<TableBinding>(
    () => ({ sceneLayer: SCENE_LAYER, onView: showView, reloadKey: fogRevision, adjustModel }),
    [fogRevision, adjustModel],
  );
  // A trava volta do banco e entra na sessão na hora; os jogadores a recebem pelo canal da mesa.
  const changeCutawayLock = useCallback(
    async (lock: Cutaway) => replaceRoom(await getRoomsService().setCutawayLock(roomId, lock)),
    [roomId, replaceRoom],
  );
  // Tempo e hora da mesa vão para a cena; ao sair da mesa, o próximo mapa abre de céu limpo.
  const tableWeather = room.tableWeather;
  useEffect(() => useWeatherStore.getState().setTable(tableWeather), [tableWeather]);
  useEffect(() => () => useWeatherStore.getState().setTable(DEFAULT_TABLE_WEATHER), []);
  return (
    <>
      {/* O mestre é quem move: o aviso que volta pelo canal não serve para ele. */}
      <TokensSync onPieceMoved={isGameMaster ? undefined : receivePieceMoved} />
      <ScenerySync />
      <FogSync />
      <TableToolsSync />
      <InitiativeSync />
      <MapWorkspace
        roomId={roomId}
        isGameMaster={isGameMaster}
        cutawayLock={room.cutawayLock}
        onCutawayLockChange={isGameMaster ? changeCutawayLock : undefined}
        table={table}
      />
    </>
  );
}
