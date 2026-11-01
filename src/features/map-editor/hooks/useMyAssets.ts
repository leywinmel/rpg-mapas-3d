import { useCallback, useEffect, useState } from 'react';
import { reportError } from '@/lib/report-error';
import { useMapEditorServices } from '../services/services-context';
import type { MapAsset } from '../types';
import { assetNameFromFile, checkGlbFile } from '../upload/glb-validation';

export type MyAssetsState = {
  status: 'loading' | 'ready' | 'error';
  assets: MapAsset[];
};

export type UploadResult = { ok: true; asset: MapAsset } | { ok: false; message: string };

/** "Meus modelos": lista, envio (com validação no navegador) e exclusão dos .glb do mestre. */
export function useMyAssets() {
  const { assets: service } = useMapEditorServices();
  const [state, setState] = useState<MyAssetsState>({ status: 'loading', assets: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    service
      .listMyAssets()
      .then((assets) => {
        if (!cancelled) setState({ status: 'ready', assets });
      })
      .catch((error: unknown) => {
        reportError(error, {
          userMessage: 'Não conseguimos carregar seus modelos.',
          context: { feature: 'map-editor', action: 'list-assets' },
          toast: false,
        });
        if (!cancelled) setState({ status: 'error', assets: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [service, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', assets: [] });
    setAttempt((value) => value + 1);
  }, []);

  const upload = useCallback(
    async (file: File): Promise<UploadResult> => {
      const check = await checkGlbFile(file);
      if (!check.ok) return check;
      try {
        const asset = await service.uploadModel({ file, name: assetNameFromFile(file.name) });
        setState((current) => ({ ...current, assets: [asset, ...current.assets] }));
        return { ok: true, asset };
      } catch (error) {
        reportError(error, {
          userMessage: 'Não conseguimos enviar o modelo.',
          context: { feature: 'map-editor', action: 'upload-model' },
          toast: false,
        });
        return {
          ok: false,
          message: 'Não conseguimos enviar o modelo. Tente de novo em instantes.',
        };
      }
    },
    [service],
  );

  const remove = useCallback(
    async (asset: MapAsset): Promise<boolean> => {
      try {
        await service.deleteAsset(asset);
        setState((current) => ({
          ...current,
          assets: current.assets.filter((item) => item.id !== asset.id),
        }));
        return true;
      } catch (error) {
        reportError(error, {
          userMessage: 'Não conseguimos apagar o modelo.',
          context: { feature: 'map-editor', action: 'delete-model' },
          toast: false,
        });
        return false;
      }
    },
    [service],
  );

  return { ...state, retry, upload, remove };
}
