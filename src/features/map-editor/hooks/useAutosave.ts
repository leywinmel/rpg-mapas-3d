import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { parseMapDocument, type GridSize, type MapDocument } from '@/domain';
import { reportError } from '@/lib/report-error';

/** Espera o mestre parar de pintar por um instante antes de gravar (menos escrita no banco). */
export const AUTOSAVE_DELAY_MS = 1200;

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

export type AutosaveOptions = {
  mapId: string;
  size: GridSize;
  document: MapDocument;
  /** Documento como veio do banco: é o ponto de partida do "Salvo". */
  baseline: MapDocument;
  save: (mapId: string, document: MapDocument) => Promise<void>;
  delayMs?: number;
};

type Snapshot = Omit<AutosaveOptions, 'baseline' | 'delayMs'> & { saved: MapDocument };

/**
 * Salvamento automático com espera. Só grava documento que passa no
 * parseMapDocument (o mesmo validador da leitura), e avisa antes de sair da
 * página com alteração pendente. Monte uma instância por mapa (key = id).
 */
export function useAutosave(options: AutosaveOptions) {
  const { mapId, size, document, baseline, save, delayMs = AUTOSAVE_DELAY_MS } = options;
  const [saved, setSaved] = useState(baseline);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'error'>('idle');
  const latest = useRef<Snapshot>({ mapId, size, document, save, saved });
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    latest.current = { mapId, size, document, save, saved };
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const snapshot = latest.current;
    if (snapshot.document === snapshot.saved || inFlight.current) return;
    const parsed = parseMapDocument(snapshot.document, snapshot.size);
    if (!parsed.ok) {
      setPhase('error');
      reportError(new Error(parsed.errors.join(' | ')), {
        userMessage: 'O mapa tem um problema e não foi salvo.',
        hint: 'Desfaça a última alteração e tente de novo.',
        context: { feature: 'map-editor', action: 'validate-map', mapId: snapshot.mapId },
      });
      return;
    }
    inFlight.current = true;
    setPhase('saving');
    try {
      await snapshot.save(snapshot.mapId, parsed.value);
      setSaved(snapshot.document);
      setPhase('idle');
    } catch (error) {
      setPhase('error');
      reportError(error, {
        userMessage: 'Erro ao salvar o mapa.',
        hint: 'Confira a conexão; tentaremos de novo na próxima alteração.',
        context: { feature: 'map-editor', action: 'save-map', mapId: snapshot.mapId },
      });
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Cada alteração reinicia a espera; se ainda estiver gravando, a próxima rodada pega o resto.
  useEffect(() => {
    if (document === saved) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delayMs);
  }, [document, saved, delayMs, flush]);

  const status: SaveStatus =
    phase === 'saving'
      ? 'saving'
      : phase === 'error'
        ? 'error'
        : document === saved
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
      if (snapshot.document === snapshot.saved) return;
      const parsed = parseMapDocument(snapshot.document, snapshot.size);
      if (!parsed.ok) return;
      snapshot.save(snapshot.mapId, parsed.value).catch((error: unknown) =>
        reportError(error, {
          userMessage: 'A última alteração do mapa não foi salva.',
          context: { feature: 'map-editor', action: 'save-on-leave', mapId: snapshot.mapId },
        }),
      );
    },
    [],
  );

  return { status, flush };
}
