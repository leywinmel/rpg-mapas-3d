import type { RapierModule } from './simulate';

let loading: Promise<RapierModule> | null = null;

/**
 * Carrega o Rapier (WASM embutido) só quando alguém vai rolar ou assistir a uma rolagem,
 * e uma vez só. Falhou? Esquece a promessa para a próxima tentativa recomeçar.
 */
export function loadRapier(): Promise<RapierModule> {
  loading ??= import('@dimforge/rapier3d-compat')
    .then(async (module) => {
      await module.default.init();
      return module.default;
    })
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}
