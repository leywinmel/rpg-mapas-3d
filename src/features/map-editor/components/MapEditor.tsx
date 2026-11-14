import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ErrorBoundary, LoadingState, notify } from '@/components';
import type { Cell } from '@/domain';
import { topStory } from '@/domain/map-v2';
import type { StyleFilter } from '@/features/scene';
import type { PerfSample } from '@/features/scene/components/PerfMeter';
import { masterCutaway, type CutawayBinding } from '../cutaway/cutaway-binding';
import { CutawayControl } from '../cutaway/CutawayControl';
import { useReportView, useShownModel, type TableBinding } from './table-binding';
import { Minimap } from '../minimap/Minimap';
import { showsMinimap } from '../minimap/minimap-image';
import { MapCornerHud } from './MapCornerHud';
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
import { EditorSidebar, HUD_CHROME_CLASS } from './EditorSidebar';
import { EditorToolbar } from './EditorToolbar';
import type { EditorSceneActions, EditorViewState } from './EditorInteraction';
import { LibraryPanel } from './LibraryPanel';
import { MapSizeControls } from './MapSizeControls';
import { PrefabPanel } from './PrefabPanel';
import { SaveIndicator } from './SaveIndicator';
import { cx } from '@/lib/cx';
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
    case 'level':
      return { type: 'shift-level', delta: command.delta };
    case 'nudge':
      return { type: 'nudge-selected', dx: command.dx, dz: command.dz };
    case 'escape':
      return { type: 'set-tool', tool: 'select' };
  }
}

/**
 * `hasSelection` diz se há objeto selecionado agora: sem ele as setas ficam com a página (rolar
 * um painel), em vez de serem engolidas por um atalho que não faria nada.
 */
function useEditorShortcuts(dispatch: (action: EditorAction) => void, hasSelection: boolean) {
  const selection = useRef(hasSelection);
  useEffect(() => {
    selection.current = hasSelection;
  }, [hasSelection]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSceneKey(event)) return;
      const command = shortcutCommand(event);
      if (!command) return;
      if (command.type === 'nudge' && !selection.current) return;
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
  /** Corte de andares: o que o mestre vê e o andar que ele escolheu para a mesa. */
  cutaway: CutawayBinding;
  onPerfSample?: (sample: PerfSample) => void;
  table?: TableBinding;
};

/**
 * Editor de diorama do mestre: junta o redutor, o salvamento automático, os
 * atalhos, os painéis e a cena. Monte com key = id do mapa: trocar de mapa
 * recomeça o histórico e grava o que faltava do mapa anterior.
 */
export function MapEditor({ map, mapsPanel, name, cutaway, onPerfSample, table }: MapEditorProps) {
  const { mapsV2 } = useMapEditorServices();
  const { summary } = map;
  const title = name ?? summary.name;
  const [state, dispatch] = useReducer(editorReducer, map.model, createEditorState);
  const [libraryStyle, setLibraryStyle] = useState<StyleFilter>('all');
  const model = state.history.present;
  const autosave = useAutosave({
    mapId: summary.id,
    model,
    loaded: map.model,
    stored: map.saved,
    save: mapsV2.saveMapV2,
  });
  useEditorShortcuts(dispatch, state.tool === 'select' && state.selectedPiece !== null);
  // O que a cena desenha: o mapa do editor com o que a mesa sobrepõe (o objeto deslizando).
  const shown = useShownModel(summary.id, model, table?.adjustModel);

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
      onGrab: (hit: PointerHit) => dispatch({ type: 'select-at', hit }),
      onDrop: (anchor: Cell) => dispatch({ type: 'move-selected', anchor }),
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

  useReportView(table, {
    mapId: summary.id,
    model,
    cutaway: masterCutaway(cutaway),
    name: title,
    modelUrls,
  });

  const tabs = [
    {
      id: 'library',
      label: 'Biblioteca',
      content: (
        <LibraryPanel
          brush={state.brush}
          tool={state.tool}
          dispatch={dispatch}
          style={libraryStyle}
          onStyleChange={setLibraryStyle}
        />
      ),
    },
    {
      id: 'prefabs',
      label: 'Casas',
      content: (
        <PrefabPanel
          brush={state.brush}
          tool={state.tool}
          dispatch={dispatch}
          libraryStyle={libraryStyle}
        />
      ),
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
            model={shown}
            editModel={model}
            modelUrls={modelUrls}
            label={`Mapa 3D: ${title}`}
            editor={{ view, actions }}
            cutaway={masterCutaway(cutaway)}
            onPerfSample={onPerfSample}
            layer={table?.sceneLayer}
          />
        </Suspense>
      </ErrorBoundary>
      <EditorSidebar title={title} tabs={tabs} />
      <MapCornerHud>
        {showsMinimap(model) && <Minimap model={model} />}
        <CutawayControl binding={cutaway} top={top} />
      </MapCornerHud>
      <div className={cx(layout.bottomBar, HUD_CHROME_CLASS)}>
        <EditorToolbar state={state} dispatch={dispatch} />
        <div className={layout.saveSlot}>
          <SaveIndicator status={autosave.status} onRetry={() => void autosave.flush()} />
        </div>
      </div>
    </>
  );
}
