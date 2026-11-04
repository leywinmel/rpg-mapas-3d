/**
 * O mapa importado entra na mesa pela mesma gravação em lotes do mapa gerado (createFromModel e
 * resumeSave): um arquivo de cidade 1000×1000 não cabe num pedido só. Aqui fica o "até onde
 * chegou" de uma importação, para a nova tentativa continuar do lote que caiu.
 */
import type { MapImportTarget } from '@/features/export';
import type { MapModel } from '@/domain/map-v2';
import { BatchSaveError } from '../services/batch-save';
import { PartialMapError, type MapActions } from './useMapActions';

type Pending = { mapId: string; saved: MapModel };

export function createMapImportTarget(
  actions: Pick<MapActions, 'createFromModel' | 'resumeSave' | 'remove'>,
): MapImportTarget {
  let created: string | null = null;
  let pending: Pending | null = null;

  return {
    async saveMap({ name, model, onProgress }) {
      try {
        if (pending) {
          const { mapId } = pending;
          await actions.resumeSave({ ...pending, current: model, onProgress });
          pending = null;
          return mapId;
        }
        const summary = await actions.createFromModel({ name, model, onProgress });
        created = summary.id;
        return summary.id;
      } catch (error) {
        if (error instanceof PartialMapError) {
          created = error.summary.id;
          pending = { mapId: error.summary.id, saved: error.saved };
        } else if (error instanceof BatchSaveError && pending) {
          pending = { ...pending, saved: error.saved };
        }
        throw error;
      }
    },

    async discard() {
      if (!created) return;
      await actions.remove(created);
      created = null;
      pending = null;
    },
  };
}
