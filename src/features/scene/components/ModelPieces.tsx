import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { reportError } from '@/lib/report-error';
import { bakeModel } from '../catalog/model-layers';
import { getFallbackLayers } from '../catalog/piece-geometry';
import type { InstanceTransform } from '../layout';
import { PieceInstances } from './PieceInstances';

type BoundaryProps = {
  fallback: ReactNode;
  onError?: (error: unknown) => void;
  children: ReactNode;
};

/** Um .glb quebrado vira a caixa marcada; o resto da cena continua de pé. */
class ModelBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const reportedUrls = new Set<string>();

/** Avisa uma vez por arquivo: um modelo repetido 30 vezes não vira 30 avisos. */
function reportModelFailure(url: string, error: unknown): void {
  if (reportedUrls.has(url)) return;
  reportedUrls.add(url);
  reportError(error, {
    userMessage: 'Um modelo 3D não carregou.',
    hint: 'Mostramos uma caixa marcada no lugar dele.',
    severity: 'warn',
    context: { feature: 'scene', action: 'load-model' },
  });
}

type LoadedProps = {
  url: string;
  fitToCell: boolean;
  transforms: readonly InstanceTransform[];
  ghost: boolean;
};

function LoadedModelPieces({ url, fitToCell, transforms, ghost }: LoadedProps) {
  // Draco desligado (baixaria o decodificador de outro site). O meshopt das peças dos pacotes
  // vem embutido no three-stdlib, sem download nem dependência nova.
  const gltf = useGLTF(url, false, true);
  const layers = useMemo(() => bakeModel(gltf.scene, { fitToCell }), [gltf, fitToCell]);
  return <PieceInstances layers={layers} transforms={transforms} ghost={ghost} />;
}

export type ModelPiecesProps = {
  /** Nulo = sabemos que o arquivo não está disponível; mostra a caixa marcada. */
  url: string | null;
  transforms: readonly InstanceTransform[];
  fitToCell?: boolean;
  ghost?: boolean;
  onError?: (error: unknown) => void;
};

/** Modelo .glb repetido em várias posições, carregado sob demanda. */
export function ModelPieces({
  url,
  transforms,
  fitToCell = true,
  ghost = false,
  onError,
}: ModelPiecesProps) {
  const fallback = (
    <PieceInstances layers={getFallbackLayers()} transforms={transforms} ghost={ghost} />
  );
  if (!url) return fallback;
  return (
    <ModelBoundary
      key={url}
      fallback={fallback}
      onError={(error) => (onError ? onError(error) : reportModelFailure(url, error))}
    >
      <Suspense fallback={null}>
        <LoadedModelPieces url={url} fitToCell={fitToCell} transforms={transforms} ghost={ghost} />
      </Suspense>
    </ModelBoundary>
  );
}
