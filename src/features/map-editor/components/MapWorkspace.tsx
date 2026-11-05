import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { EmptyState, ErrorBoundary, ErrorState, LoadingState } from '@/components';
import { NO_CUTAWAY, topStory, type Cutaway } from '@/domain/map-v2';
import { reuseUnchangedChunks } from '@/features/scene/chunks/stable-model';
import type { PerfSample } from '@/features/scene/components/PerfMeter';
import { visibleCutaway, type CutawayBinding } from '../cutaway/cutaway-binding';
import { CutawayControl } from '../cutaway/CutawayControl';
import { Minimap } from '../minimap/Minimap';
import { showsMinimap } from '../minimap/minimap-image';
import { MapCornerHud } from './MapCornerHud';
import { useReportView, useShownModel, type TableBinding } from './table-binding';
import { useOwnCutaway } from '../cutaway/useOwnCutaway';
import { sortMaps } from '../editor/map-list';
import { useMapActions } from '../hooks/useMapActions';
import { useMapModel } from '../hooks/useMapModel';
import { uploadedAssetIds, useModelUrls } from '../hooks/useModelUrls';
import { useRoomMaps } from '../hooks/useRoomMaps';
import { EditorSidebar } from './EditorSidebar';
import { MapEditor } from './MapEditor';
import { MapListPanel } from './MapListPanel';
import layout from './MapWorkspace.module.css';

const MapViewport = lazy(() => import('./MapViewport'));

export type MapWorkspaceProps = {
  roomId: string;
  isGameMaster: boolean;
  /** Recebe a medição de quadros por segundo da cena (página de desenvolvimento). */
  onPerfSample?: (sample: PerfSample) => void;
  /** Corte de andares em que o mestre travou os jogadores (rooms.cutaway_lock). */
  cutawayLock?: Cutaway;
  /** Só o mestre: grava a trava do corte da mesa. */
  onCutawayLockChange?: (lock: Cutaway) => Promise<void>;
  /** Tokens e névoa da mesa, pendurados na cena. */
  table?: TableBinding;
};

type RoomMaps = ReturnType<typeof useRoomMaps>;

function Centered({ children }: { children: ReactNode }) {
  return <div className={layout.center}>{children}</div>;
}

const MAP_LOAD_ERROR = {
  load: 'Não conseguimos abrir o mapa. Confira a conexão e tente de novo.',
  invalid: 'Este mapa está num formato que não reconhecemos.',
} as const;

/** O jogador só vê o mapa que o mestre mostrou à mesa, sem ferramentas. */
function PlayerView({
  room,
  cutaway,
  onPerfSample,
  table,
}: {
  room: RoomMaps;
  cutaway: CutawayBinding;
  onPerfSample?: MapWorkspaceProps['onPerfSample'];
  table?: TableBinding;
}) {
  const mapId = room.activeMapId;
  const [attempt, setAttempt] = useState(0);
  // A cada gravação do mestre o mapa volta inteiro do banco; os pedaços iguais reaproveitam o
  // objeto de antes, e a cena redesenha só o que mudou.
  const state = useMapModel(mapId, {
    revision: (mapId ? (room.revisions[mapId] ?? 0) : 0) + (table?.reloadKey ?? 0),
    attempt,
    settle: reuseUnchangedChunks,
    incremental: true,
  });
  const readyModel = state.status === 'ready' ? state.map.model : null;
  // A cena desenha o mapa com o ajuste da mesa; a mesa (tokens, névoa, exportar) segue o do banco.
  const model = useShownModel(mapId, readyModel, table?.adjustModel);
  const assetIds = useMemo(() => uploadedAssetIds(readyModel), [readyModel]);
  const modelUrls = useModelUrls(assetIds);
  const top = useMemo(() => (readyModel ? topStory(readyModel) : 0), [readyModel]);
  const name = room.maps.find((map) => map.id === mapId)?.name;
  useReportView(
    table,
    mapId && readyModel
      ? { mapId, model: readyModel, cutaway: visibleCutaway(cutaway), name, modelUrls }
      : null,
  );

  if (!mapId) {
    return (
      <Centered>
        <EmptyState
          icon={<MapIcon size={22} />}
          title="O mestre ainda não mostrou um mapa"
          description="Assim que ele abrir um mapa para a mesa, ele aparece aqui."
        />
      </Centered>
    );
  }
  if (state.status === 'error') {
    return (
      <Centered>
        <ErrorState
          description={MAP_LOAD_ERROR[state.reason]}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      </Centered>
    );
  }
  if (state.status !== 'ready') return <LoadingState label="Carregando o mapa…" fill />;

  const { summary } = state.map;
  return (
    <>
      <ErrorBoundary area="a cena 3D" fill>
        <Suspense fallback={<LoadingState label="Montando a cena 3D…" fill />}>
          <MapViewport
            model={model ?? state.map.model}
            modelUrls={modelUrls}
            label={`Mapa 3D: ${name ?? summary.name}`}
            cutaway={visibleCutaway(cutaway)}
            onPerfSample={onPerfSample}
            layer={table?.sceneLayer}
          />
        </Suspense>
      </ErrorBoundary>
      <span className={layout.mapTag}>{name ?? summary.name}</span>
      <MapCornerHud>
        {showsMinimap(state.map.model) && <Minimap model={state.map.model} />}
        <CutawayControl binding={cutaway} top={top} />
      </MapCornerHud>
    </>
  );
}

/** Mestre: lista de mapas da mesa e o editor do mapa escolhido (que pode não ser o da mesa). */
function GameMasterView({
  roomId,
  room,
  cutaway,
  onPerfSample,
  table,
}: {
  roomId: string;
  room: RoomMaps;
  cutaway: CutawayBinding;
  onPerfSample?: MapWorkspaceProps['onPerfSample'];
  table?: TableBinding;
}) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const actions = useMapActions({
    roomId,
    activeMapId: room.activeMapId,
    maps: room.maps,
    patch: room.patch,
  });
  const exists = (id: string | null) => id !== null && room.maps.some((map) => map.id === id);
  // Sem escolha (ou se o escolhido foi apagado), abre o mapa da mesa ou o primeiro da lista.
  const selectedId = exists(chosenId)
    ? chosenId
    : exists(room.activeMapId)
      ? room.activeMapId
      : (sortMaps(room.maps)[0]?.id ?? null);
  // O mestre ignora as revisões do tempo real: o eco das próprias gravações não pode reabrir o mapa.
  const state = useMapModel(selectedId, { attempt });
  const selected = room.maps.find((map) => map.id === selectedId);

  const mapsPanel = (
    <MapListPanel
      maps={room.maps}
      activeMapId={room.activeMapId}
      selectedMapId={selectedId}
      onSelect={setChosenId}
      actions={actions}
    />
  );

  if (state.status === 'ready' && state.map.summary.id === selectedId) {
    return (
      <MapEditor
        key={selectedId}
        map={state.map}
        name={selected?.name}
        mapsPanel={mapsPanel}
        cutaway={cutaway}
        onPerfSample={onPerfSample}
        table={table}
      />
    );
  }

  return (
    <>
      <EditorSidebar
        title="Mapas da mesa"
        tabs={[{ id: 'maps', label: 'Mapas', content: mapsPanel }]}
      />
      <Centered>
        {!selectedId && (
          <EmptyState
            icon={<MapIcon size={22} />}
            title="Esta mesa ainda não tem mapas"
            description="Crie um mapa no painel ao lado para começar o diorama."
          />
        )}
        {selectedId && state.status === 'error' && (
          <ErrorState
            description={MAP_LOAD_ERROR[state.reason]}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        )}
        {selectedId && state.status !== 'error' && <LoadingState label="Abrindo o mapa…" />}
      </Centered>
    </>
  );
}

/**
 * Área do mapa da sala. O mestre edita e escolhe o mapa da mesa; o jogador vê
 * só o mapa ativo. Trocas de mapa e gravações chegam pelo tempo real.
 */
export function MapWorkspace({
  roomId,
  isGameMaster,
  onPerfSample,
  cutawayLock = NO_CUTAWAY,
  onCutawayLockChange,
  table,
}: MapWorkspaceProps) {
  const room = useRoomMaps(roomId);
  const [ownCutaway, setOwnCutaway] = useOwnCutaway(roomId);
  const cutaway = useMemo<CutawayBinding>(
    () => ({
      own: ownCutaway,
      setOwn: setOwnCutaway,
      lock: cutawayLock,
      isMaster: isGameMaster,
      changeLock: onCutawayLockChange,
    }),
    [ownCutaway, setOwnCutaway, cutawayLock, isGameMaster, onCutawayLockChange],
  );

  if (room.status === 'loading') {
    return (
      <div className={layout.workspace}>
        <LoadingState label="Carregando os mapas da mesa…" fill />
      </div>
    );
  }
  if (room.status === 'error') {
    return (
      <div className={layout.workspace}>
        <Centered>
          <ErrorState
            description="Não conseguimos carregar os mapas da mesa."
            onRetry={room.retry}
          />
        </Centered>
      </div>
    );
  }
  return (
    <div className={layout.workspace}>
      {isGameMaster ? (
        <GameMasterView
          roomId={roomId}
          room={room}
          cutaway={cutaway}
          onPerfSample={onPerfSample}
          table={table}
        />
      ) : (
        <PlayerView room={room} cutaway={cutaway} onPerfSample={onPerfSample} table={table} />
      )}
    </div>
  );
}
