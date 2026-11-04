import { useCallback, useRef, useState } from 'react';
import { generateSettlement } from '@/domain/map-gen';
import type { MapModel } from '@/domain/map-v2';
import { PartialMapError, type MapActions } from '../hooks/useMapActions';
import { BatchSaveError, type SaveProgress } from '../services/batch-save';
import type { MapSummary } from '../types';
import { presetSize, type GenerateMapInput } from './generate-form';

/** Mapa criado no banco que ainda não recebeu todos os pedaços. */
type Pending = { summary: MapSummary; saved: MapModel; current: MapModel };

export type GenerationState =
  | { phase: 'idle' }
  | { phase: 'generating' }
  | { phase: 'saving'; progress: SaveProgress }
  | { phase: 'failed'; message: string; pending: Pending | null }
  | { phase: 'discarding'; pending: Pending };

const IDLE: GenerationState = { phase: 'idle' };
const NO_PROGRESS: SaveProgress = { done: 0, total: 0 };

/** Deixa o navegador pintar o "Gerando…" antes de o gerador ocupar a página por até 1 s. */
function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

function partialMessage(pending: Pending): string {
  return (
    `O mapa “${pending.summary.name}” foi criado, mas parte dele não foi gravada. ` +
    'Ele já abre, com chão liso onde faltou. Tente de novo para completar.'
  );
}

type Actions = Pick<MapActions, 'createFromModel' | 'resumeSave' | 'remove'>;

/**
 * Gera a vila ou cidade e grava em lotes, com progresso. Se um lote falha, o estado guarda o
 * que já foi gravado: "Tentar de novo" manda só o resto, e "Apagar" desiste do mapa.
 */
export function useGenerateMap(actions: Actions, onDone: (summary: MapSummary) => void) {
  const [state, setState] = useState<GenerationState>(IDLE);
  const lastInput = useRef<GenerateMapInput | null>(null);
  const onProgress = (progress: SaveProgress) => setState({ phase: 'saving', progress });

  const fail = useCallback((error: unknown, pending: Pending | null, current?: MapModel) => {
    if (error instanceof PartialMapError && current) {
      const next = { summary: error.summary, saved: error.saved, current };
      return setState({ phase: 'failed', message: partialMessage(next), pending: next });
    }
    if (error instanceof BatchSaveError && pending) {
      const next = { ...pending, saved: error.saved };
      return setState({ phase: 'failed', message: partialMessage(next), pending: next });
    }
    setState({
      phase: 'failed',
      message: pending ? partialMessage(pending) : 'Não conseguimos criar o mapa. Tente de novo.',
      pending,
    });
  }, []);

  const start = useCallback(
    async (input: GenerateMapInput) => {
      lastInput.current = input;
      setState({ phase: 'generating' });
      await yieldToPaint();
      let model: MapModel;
      try {
        const size = presetSize(input.preset);
        model = generateSettlement({ style: input.style, size, seed: input.seed }).model;
      } catch (error) {
        return fail(error, null);
      }
      setState({ phase: 'saving', progress: NO_PROGRESS });
      try {
        const summary = await actions.createFromModel({ name: input.name, model, onProgress });
        setState(IDLE);
        onDone(summary);
      } catch (error) {
        fail(error, null, model);
      }
    },
    [actions, onDone, fail],
  );

  const retry = useCallback(async () => {
    if (state.phase !== 'failed') return;
    const { pending } = state;
    if (!pending) {
      if (lastInput.current) await start(lastInput.current);
      return;
    }
    setState({ phase: 'saving', progress: NO_PROGRESS });
    try {
      await actions.resumeSave({
        mapId: pending.summary.id,
        saved: pending.saved,
        current: pending.current,
        onProgress,
      });
      setState(IDLE);
      onDone(pending.summary);
    } catch (error) {
      fail(error, pending);
    }
  }, [state, actions, onDone, start, fail]);

  /** Desiste do mapa incompleto: apaga a linha no banco (os pedaços vão junto). */
  const discard = useCallback(async () => {
    if (state.phase !== 'failed' || !state.pending) return;
    const { pending } = state;
    setState({ phase: 'discarding', pending });
    try {
      await actions.remove(pending.summary.id);
      setState(IDLE);
    } catch {
      setState({
        phase: 'failed',
        message: 'Não conseguimos apagar o mapa incompleto. Tente de novo.',
        pending,
      });
    }
  }, [state, actions]);

  const busy =
    state.phase === 'generating' || state.phase === 'saving' || state.phase === 'discarding';
  return { state, busy, start, retry, discard };
}
