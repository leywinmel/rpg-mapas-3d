import { pieceCatalog } from '../catalog/catalog';
import { getPieceLayers } from '../catalog/piece-geometry';
import type { InstanceTransform, PropAsset } from '../layout';
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
  ghost?: boolean;
};

/** Peça do catálogo, procedural ou .glb de pacote: o chamador não precisa saber qual. */
export function CatalogPieces({ pieceKey, transforms, ghost = false }: CatalogPiecesProps) {
  const entry = pieceCatalog.get(pieceKey);
  if (entry?.visual.type === 'model') {
    return (
      <ModelPieces
        url={entry.visual.url}
        transforms={transforms}
        fitToCell={entry.kind === 'prop'}
        ghost={ghost}
      />
    );
  }
  return <PieceInstances layers={getPieceLayers(pieceKey)} transforms={transforms} ghost={ghost} />;
}

type AssetPiecesProps = {
  asset: PropAsset;
  transforms: readonly InstanceTransform[];
  modelUrls?: ModelUrls;
  ghost?: boolean;
};

export function AssetPieces({ asset, transforms, modelUrls, ghost = false }: AssetPiecesProps) {
  if (asset.source === 'catalog') {
    return <CatalogPieces pieceKey={asset.key} transforms={transforms} ghost={ghost} />;
  }
  const url = modelUrls ? modelUrls[asset.assetId] : null;
  if (url === undefined) return null;
  return <ModelPieces url={url} transforms={transforms} ghost={ghost} />;
}
