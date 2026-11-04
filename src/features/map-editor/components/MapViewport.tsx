/**
 * Ponto de entrada da cena 3D do editor e do jogador. É carregado com
 * React.lazy: three.js e companhia ficam num pedaço separado do build.
 */
import type { ReactNode } from 'react';
import type { Cutaway, MapModel } from '@/domain/map-v2';
import type { ModelUrls } from '@/features/scene/components/AssetPieces';
import type { PerfSample } from '@/features/scene/components/PerfMeter';
import { MapScene } from '@/features/scene/components/SceneCanvas';
import { SCENE_UI_USER_DATA } from '@/features/scene/scene-ui';
import { EditorInteraction, type EditorSceneBinding } from './EditorInteraction';

export type MapViewportProps = {
  model: MapModel;
  modelUrls: ModelUrls;
  label: string;
  /** Corte de andares de quem está olhando (já com a trava do mestre aplicada). */
  cutaway?: Cutaway;
  /** Presente só para o mestre: liga as ferramentas de edição na cena. */
  editor?: EditorSceneBinding;
  onPerfSample?: (sample: PerfSample) => void;
  /** Camada da mesa (tokens, névoa), por cima do mapa. */
  layer?: ReactNode;
};

export default function MapViewport({ editor, layer, ...scene }: MapViewportProps) {
  const editing = editor && editor.view.tool !== 'select';
  return (
    <MapScene {...scene} mode={editing ? 'edit' : 'view'}>
      {editor && (
        // O cursor e o fantasma do editor são interface: a imagem exportada pode escondê-los.
        <group userData={SCENE_UI_USER_DATA}>
          <EditorInteraction
            model={scene.model}
            modelUrls={scene.modelUrls}
            view={editor.view}
            actions={editor.actions}
          />
        </group>
      )}
      {layer}
    </MapScene>
  );
}
