export type Coalescer = {
  /** Pede a execução. Pedidos feitos enquanto um já espera viram o mesmo. */
  trigger: () => void;
  /** Desiste do que estava esperando (ao desmontar). */
  cancel: () => void;
};

/**
 * Junta sinais em sequência numa execução só, `delayMs` depois do primeiro. O espaço entre o
 * primeiro sinal e a execução tem limite fixo, então a lista nunca fica atrasada além dele
 * mesmo que os sinais não parem.
 */
export function createCoalescer(run: () => void, delayMs: number): Coalescer {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    trigger() {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        run();
      }, delayMs);
    },
    cancel() {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
    },
  };
}
