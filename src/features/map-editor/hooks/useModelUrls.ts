import { useEffect, useMemo, useState } from 'react';
import type { MapDocument } from '@/domain';
import { reportError } from '@/lib/report-error';
import { useMapEditorServices } from '../services/services-context';

/** Ids dos modelos enviados que o mapa usa, sem repetição e em ordem estável. */
export function uploadedAssetIds(document: MapDocument | null): string[] {
  if (!document) return [];
  const ids = new Set<string>();
  for (const prop of document.props) {
    if (prop.asset.source === 'upload') ids.add(prop.asset.assetId);
  }
  return [...ids].sort();
}

/**
 * URLs assinadas dos modelos .glb. Cada id é assinado uma vez por sessão:
 * pedir de novo mudaria a URL e o modelo seria baixado outra vez.
 */
export function useModelUrls(assetIds: readonly string[]) {
  const { assets } = useMapEditorServices();
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const missingKey = useMemo(
    () => assetIds.filter((id) => !(id in urls)).join(','),
    [assetIds, urls],
  );

  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    assets
      .signModelUrls(missingKey.split(','))
      .then((signed) => {
        if (!cancelled) setUrls((current) => ({ ...current, ...signed }));
      })
      .catch((error: unknown) => {
        reportError(error, {
          userMessage: 'Não conseguimos carregar os modelos 3D enviados.',
          hint: 'Eles aparecem como caixas marcadas até recarregar a página.',
          severity: 'warn',
          context: { feature: 'map-editor', action: 'sign-model-urls' },
        });
        if (cancelled) return;
        const failed = Object.fromEntries(missingKey.split(',').map((id) => [id, null]));
        setUrls((current) => ({ ...current, ...failed }));
      });
    return () => {
      cancelled = true;
    };
  }, [assets, missingKey]);

  return urls;
}
