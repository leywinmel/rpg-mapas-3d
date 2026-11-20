import { useMemo } from 'react';
import { pieceCatalog } from '../catalog/catalog';
import { INTERACTIVE_MODELS } from '../catalog/interactive-models';
import { getPieceLayers } from '../catalog/piece-geometry';
import type { PieceState } from '../chunks/chunk-instances';
import { regroupWallSegments, type InstanceTransform, type PropAsset } from '../layout';
import { ModelPieces } from './ModelPieces';
import { PieceInstances } from './PieceInstances';

/**
 * Endereço (URL assinada) de cada modelo enviado, por id de map_assets.
 * Ausente = ainda resolvendo; nulo = indisponível (vira a caixa marcada).
 */
export type ModelUrls = Readonly<Record<string, string | null>>;

type CatalogPiecesProps = {
  pieceKey: string;
  transforms: readonly InstanceTransform[];
  tint?: string;
  ghost?: boolean;
  /** Aberta ou fechada, por cópia: só nas peças com interação (RPG-44). */
  states?: readonly PieceState[];
};

/** Peça do catálogo, procedural ou .glb de pacote: o chamador não precisa saber qual. */
export function CatalogPieces({
  pieceKey,
  transforms,
  tint,
  ghost = false,
  states,
}: CatalogPiecesProps) {
  const entry = pieceCatalog.get(pieceKey);
  const model = INTERACTIVE_MODELS[pieceKey];
  const interaction = useMemo(
    () => (model && states ? { model, states } : undefined),
    [model, states],
  );
  const span = entry?.wallSpan;
  const placed = useMemo(
    () => (span ? regroupWallSegments(transforms, span) : transforms),
    [transforms, span],
  );
  if (entry?.visual.type === 'model') {
    // O modelo do pacote já vem normalizado (origem e escala em casas): nada de encaixar.
    return (
      <ModelPieces
        url={entry.visual.url}
        transforms={placed}
        fitToCell={false}
        tint={tint}
        ghost={ghost}
        interaction={interaction}
      />
    );
  }
  return (
    <PieceInstances
      layers={getPieceLayers(pieceKey)}
      transforms={transforms}
      tint={tint}
      ghost={ghost}
    />
  );
}

type AssetPiecesProps = {
  asset: PropAsset;
  transforms: readonly InstanceTransform[];
  modelUrls?: ModelUrls;
  tint?: string;
  ghost?: boolean;
  states?: readonly PieceState[];
};

export function AssetPieces({
  asset,
  transforms,
  modelUrls,
  tint,
  ghost = false,
  states,
}: AssetPiecesProps) {
  if (asset.source === 'catalog') {
    return (
      <CatalogPieces
        pieceKey={asset.key}
        transforms={transforms}
        tint={tint}
        ghost={ghost}
        states={states}
      />
    );
  }
  const url = modelUrls ? modelUrls[asset.assetId] : null;
  if (url === undefined) return null;
  return <ModelPieces url={url} transforms={transforms} tint={tint} ghost={ghost} />;
}
