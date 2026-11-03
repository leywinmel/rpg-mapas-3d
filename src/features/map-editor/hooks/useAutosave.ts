import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MapModel } from '@/domain/map-v2';
import type { SaveMapV2Input } from '../services/map-v2-service';
import { reportMapFailure } from '../services/map-errors';

/** Espera o mestre parar de pintar por um instante antes de gravar (menos escrita no banco). */
export const AUTOSAVE_DELAY_MS = 1200;

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

export type AutosaveOptions = {
  mapId: string;
  /** O mapa na tela agora. */
  model: MapModel;
  /** O mapa como veio do banco: é o ponto de partida do "Salvo". */
  loaded: MapModel;
  /** O que o banco guarda hoje no v2 (nulo quando o mapa ainda está no v1). */
  stored: MapModel | null;
  save: (input: SaveMapV2Input) => Promise<unknown>;
  delayMs?: number;
};

/** O banco depois da última gravação que deu certo. */
type Persisted = {
  /** Igual ao mapa na tela = nada pendente. */
  clean: MapModel;
  /** Base da próxima gravação: só vão os pedaços que mudaram desde ela. */
  stored: MapModel | null;
};

type Snapshot = { mapId: string; model: MapModel; save: AutosaveOptions['save'] } & Persisted;

/**
 * Salvamento automático com espera. Grava pelo serviço do v2, que manda só os pedaços que
 * mudaram desde a última gravação (o mapa v1 vira v2 na primeira). Avisa antes de sair da
 * página com alteração pendente. Monte uma instância por mapa (key = id).
 */
export function useAutosave(options: AutosaveOptions) {
  const { mapId, model, loaded, stored, save, delayMs = AUTOSAVE_DELAY_MS } = options;
  const [persisted, setPersisted] = useState<Persisted>({ clean: loaded, stored });
  const [phase, setPhase] = useState<'idle' | 'saving' | 'error'>('idle');
  const latest = useRef<Snapshot>({ mapId, model, save, ...persisted });
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    latest.current = { mapId, model, save, ...persisted };
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const snapshot = latest.current;
    if (snapshot.model === snapshot.clean || inFlight.current) return;
    inFlight.current = true;
    setPhase('saving');
    try {
      await snapshot.save({
        mapId: snapshot.mapId,
        saved: snapshot.stored,
        current: snapshot.model,
      });
      setPersisted({ clean: snapshot.model, stored: snapshot.model });
      setPhase('idle');
    } catch (error) {
      setPhase('error');
      reportMapFailure(error, { action: 'save-map', mapId: snapshot.mapId });
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Cada alteração reinicia a espera; se ainda estiver gravando, a próxima rodada pega o resto.
  useEffect(() => {
    if (model === persisted.clean) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delayMs);
  }, [model, persisted, delayMs, flush]);

  const status: SaveStatus =
    phase === 'saving'
      ? 'saving'
      : phase === 'error'
        ? 'error'
        : model === persisted.clean
          ? 'saved'
          : 'dirty';

  useEffect(() => {
    if (status === 'saved') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  // Trocar de mapa ou sair da tela não pode perder o último traço: grava na hora.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      const snapshot = latest.current;
      if (snapshot.model === snapshot.clean) return;
      snapshot
        .save({ mapId: snapshot.mapId, saved: snapshot.stored, current: snapshot.model })
        .catch((error: unknown) =>
          reportMapFailure(error, { action: 'save-on-leave', mapId: snapshot.mapId }),
        );
    },
    [],
  );

  return { status, flush };
}
