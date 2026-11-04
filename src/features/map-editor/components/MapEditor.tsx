import { lazy, Suspense, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { ErrorBoundary, LoadingState, notify } from '@/components';
import { topStory } from '@/domain/map-v2';
import type { PerfSample } from '@/features/scene/components/PerfMeter';
import { visibleCutaway, type CutawayBinding } from '../cutaway/cutaway-binding';
import { CutawayControl } from '../cutaway/CutawayControl';
import {
  createEditorState,
  editorReducer,
  type EditorAction,
  type PointerHit,
} from '../editor/editor-reducer';
import { isSceneKey, shortcutCommand, type EditorCommand } from '../editor/shortcuts';
import { useAutosave } from '../hooks/useAutosave';
import type { LoadedMap } from '../hooks/useMapModel';
import { uploadedAssetIds, useModelUrls } from '../hooks/useModelUrls';
import { useMapEditorServices } from '../services/services-context';
import { AmbienceControls } from './AmbienceControls';
import { EditorSidebar } from './EditorSidebar';
import { EditorToolbar } from './EditorToolbar';
import type { EditorSceneActions, EditorViewState } from './EditorInteraction';
import { LibraryPanel } from './LibraryPanel';
import { MapSizeControls } from './MapSizeControls';
import { SaveIndicator } from './SaveIndicator';
import layout from './MapWorkspace.module.css';
import panel from './SidePanel.module.css';

// three.js só é baixado quando a cena aparece: a tela inicial fica leve.
const MapViewport = lazy(() => import('./MapViewport'));

function commandToAction(command: EditorCommand): EditorAction {
  switch (command.type) {
    case 'tool':
      return { type: 'set-tool', tool: command.tool };
    case 'rotate':
      return { type: 'rotate' };
    case 'undo':
      return { type: 'undo' };
    case 'redo':
      return { type: 'redo' };
    case 'delete':
      return { type: 'delete-selected' };
    case 'escape':
      return { type: 'set-tool', tool: 'select' };
  }
}

function useEditorShortcuts(dispatch: (action: EditorAction) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSceneKey(event)) return;
      const command = shortcutCommand(event);
      if (!command) return;
      event.preventDefault();
      dispatch(commandToAction(command));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch]);
}

export type MapEditorProps = {
  map: LoadedMap;
  /** Conteúdo da aba "Mapas" (a lista da mesa vive fora do editor). */
  mapsPanel: ReactNode;
  /** Nome atual vindo da lista da mesa (o mapa carregado não acompanha renomeações). */
  name?: string;
  /** Corte de andares do mestre (a trava dos jogadores não o alcança). */
  cutaway: CutawayBinding;
  onPerfSample?: (sample: PerfSample) => void;
};

/**
 * Editor de diorama do mestre: junta o redutor, o salvamento automático, os
 * atalhos, os painéis e a cena. Monte com key = id do mapa: trocar de mapa
 * recomeça o histórico e grava o que faltava do mapa anterior.
 */
export function MapEditor({ map, mapsPanel, name, cutaway, onPerfSample }: MapEditorProps) {
  const { mapsV2 } = useMapEditorServices();
  const { summary } = map;
  const title = name ?? summary.name;
  const [state, dispatch] = useReducer(editorReducer, map.model, createEditorState);
  const model = state.history.present;
  const autosave = useAutosave({
    mapId: summary.id,
    model,
    loaded: map.model,
    stored: map.saved,
    save: mapsV2.saveMapV2,
  });
  useEditorShortcuts(dispatch);

  // Jogada recusada (ex: a peça não cabe): avisa uma vez; o mesmo aviso repetido no arraste não.
  useEffect(() => {
    if (state.notice) notify.warning(state.notice.message);
  }, [state.notice]);

  const brushAssetId = state.brush.prop.source === 'upload' ? state.brush.prop.assetId : null;
  const assetIds = useMemo(() => {
    const ids = uploadedAssetIds(model);
    return brushAssetId && !ids.includes(brushAssetId) ? [...ids, brushAssetId] : ids;
  }, [model, brushAssetId]);
  const modelUrls = useModelUrls(assetIds);
  const top = useMemo(() => topStory(model), [model]);

  const actions = useMemo<EditorSceneActions>(
    () => ({
      onStrokeStart: (hit: PointerHit) =>
        dispatch({ type: 'stroke-start', hit, newPropId: crypto.randomUUID() }),
      onStrokeMove: (hit: PointerHit) => dispatch({ type: 'stroke-move', hit }),
      onStrokeEnd: () => dispatch({ type: 'stroke-end' }),
      onSelectAt: (hit: PointerHit) => dispatch({ type: 'select-at', hit }),
    }),
    [],
  );
  const view = useMemo<EditorViewState>(
    () => ({
      tool: state.tool,
      brush: state.brush,
      rotation: state.rotation,
      footprint: state.footprint,
      wallHeight: state.wallHeight,
      selectedPiece: state.selectedPiece,
    }),
    [
      state.tool,
      state.brush,
      state.rotation,
      state.footprint,
      state.wallHeight,
      state.selectedPiece,
    ],
  );

  const tabs = [
    {
      id: 'library',
      label: 'Biblioteca',
      content: <LibraryPanel brush={state.brush} tool={state.tool} dispatch={dispatch} />,
    },
    { id: 'maps', label: 'Mapas', content: mapsPanel },
    {
      id: 'ambience',
      label: 'Ambiente',
      content: (
        <div className={panel.stack}>
          <AmbienceControls ambience={model.header.ambience} dispatch={dispatch} />
          <MapSizeControls
            key={`${model.size.width}x${model.size.depth}`}
            size={model.size}
            dispatch={dispatch}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <ErrorBoundary area="a cena 3D" fill>
        <Suspense fallback={<LoadingState label="Montando a cena 3D…" fill />}>
          <MapViewport
            model={model}
            modelUrls={modelUrls}
            label={`Mapa 3D: ${title}`}
            editor={{ view, actions }}
            cutaway={visibleCutaway(cutaway)}
            onPerfSample={onPerfSample}
          />
        </Suspense>
      </ErrorBoundary>
      <EditorSidebar title={title} tabs={tabs} />
      <CutawayControl binding={cutaway} top={top} />
      <div className={layout.bottomBar}>
        <EditorToolbar state={state} dispatch={dispatch} />
        <div className={layout.saveSlot}>
          <SaveIndicator status={autosave.status} onRetry={() => void autosave.flush()} />
        </div>
      </div>
    </>
  );
}
