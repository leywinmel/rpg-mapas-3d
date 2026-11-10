import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { EmptyState, ErrorBoundary, ErrorState, LoadingState } from '@/components';
import { NO_CUTAWAY, type Cutaway } from '@/domain/map-v2';
import { reuseUnchangedChunks } from '@/features/scene/chunks/stable-model';
import type { PerfSample } from '@/features/scene/components/PerfMeter';
import { playerCutaway, type CutawayBinding } from '../cutaway/cutaway-binding';
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
import { MapListDialogs, MapListPanel, useMapDialogs } from './MapListPanel';
import layout from './MapWorkspace.module.css';

const MapViewport = lazy(() => import('./MapViewport'));

export type MapWorkspaceProps = {
  roomId: string;
  isGameMaster: boolean;
  /** Recebe a medição de quadros por segundo da cena (página de desenvolvimento). */
  onPerfSample?: (sample: PerfSample) => void;
  /** Andar que os jogadores veem, escolhido pelo mestre (rooms.cutaway_lock); null = tudo. */
  cutawayLock?: Cutaway;
  /** Só o mestre: grava o andar que os jogadores veem. */
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

/**
 * O jogador só vê o mapa que o mestre mostrou à mesa, sem ferramentas: nem o corte de andares
 * ele escolhe, vê o andar que o mestre escolheu para a mesa (RPG-30).
 */
function PlayerView({
  room,
  cutawayLock,
  onPerfSample,
  table,
}: {
  room: RoomMaps;
  cutawayLock: Cutaway;
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
  const cutaway = playerCutaway(cutawayLock);
  const name = room.maps.find((map) => map.id === mapId)?.name;
  useReportView(
    table,
    mapId && readyModel ? { mapId, model: readyModel, cutaway, name, modelUrls } : null,
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
            cutaway={cutaway}
            onPerfSample={onPerfSample}
            layer={table?.sceneLayer}
          />
        </Suspense>
      </ErrorBoundary>
      <span className={layout.mapTag}>{name ?? summary.name}</span>
      <MapCornerHud>
        {showsMinimap(state.map.model) && <Minimap model={state.map.model} />}
      </MapCornerHud>
    </>
  );
}

/** Mestre: lista de mapas da mesa e o editor do mapa escolhido (que pode não ser o da mesa). */
function GameMasterView({
  roomId,
  room,
  cutawayLock,
  onCutawayLockChange,
  onPerfSample,
  table,
}: {
  roomId: string;
  room: RoomMaps;
  cutawayLock: Cutaway;
  onCutawayLockChange?: (lock: Cutaway) => Promise<void>;
  onPerfSample?: MapWorkspaceProps['onPerfSample'];
  table?: TableBinding;
}) {
  const [ownCutaway, setOwnCutaway] = useOwnCutaway(roomId);
  const cutaway = useMemo<CutawayBinding>(
    () => ({
      own: ownCutaway,
      setOwn: setOwnCutaway,
      tableCutaway: cutawayLock,
      setTableCutaway: onCutawayLockChange,
    }),
    [ownCutaway, setOwnCutaway, cutawayLock, onCutawayLockChange],
  );
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

  const dialogs = useMapDialogs({ selectedMapId: selectedId, onSelect: setChosenId, actions });
  const mapsPanel = (
    <MapListPanel maps={room.maps} activeMapId={room.activeMapId} dialogs={dialogs} />
  );

  // As janelas ficam sempre no mesmo lugar: o mapa que abre no editor não as desmonta.
  return (
    <>
      <GameMasterArea
        selectedId={selectedId}
        state={state}
        name={selected?.name}
        mapsPanel={mapsPanel}
        onRetry={() => setAttempt((value) => value + 1)}
        cutaway={cutaway}
        onPerfSample={onPerfSample}
        table={table}
      />
      <MapListDialogs dialogs={dialogs} />
    </>
  );
}

type GameMasterAreaProps = {
  selectedId: string | null;
  state: ReturnType<typeof useMapModel>;
  name: string | undefined;
  mapsPanel: ReactNode;
  onRetry: () => void;
  cutaway: CutawayBinding;
  onPerfSample?: MapWorkspaceProps['onPerfSample'];
  table?: TableBinding;
};

/** O editor do mapa escolhido ou, enquanto ele não abre, a lista com o aviso do momento. */
function GameMasterArea({
  selectedId,
  state,
  name,
  mapsPanel,
  onRetry,
  cutaway,
  onPerfSample,
  table,
}: GameMasterAreaProps) {
  if (state.status === 'ready' && state.map.summary.id === selectedId) {
    return (
      <MapEditor
        key={selectedId}
        map={state.map}
        name={name}
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
          <ErrorState description={MAP_LOAD_ERROR[state.reason]} onRetry={onRetry} />
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
          cutawayLock={cutawayLock}
          onCutawayLockChange={onCutawayLockChange}
          onPerfSample={onPerfSample}
          table={table}
        />
      ) : (
        <PlayerView
          room={room}
          cutawayLock={cutawayLock}
          onPerfSample={onPerfSample}
          table={table}
        />
      )}
    </div>
  );
}
