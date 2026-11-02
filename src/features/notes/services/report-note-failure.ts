import { reportError } from '@/lib/report-error';
import { toNoteError } from './note-errors';

export type ReportNoteOptions = {
  action: string;
  /** Falso quando a própria tela (janela, lista) mostra a frase devolvida. */
  toast?: boolean;
};

/** Registra a falha (com o código, sem dado pessoal) e devolve a frase amigável. */
export function reportNoteFailure(error: unknown, { action, toast = false }: ReportNoteOptions) {
  const noteError = toNoteError(error);
  reportError(error, {
    userMessage: noteError.message,
    context: { feature: 'notes', action, kind: noteError.kind, code: noteError.code },
    severity: noteError.kind === 'unknown' ? 'error' : 'warn',
    toast,
  });
  return noteError.message;
}

/** Para o que a cena não precisa mostrar: a ação principal já deu certo e a falha só vai para o log. */
export function reportNoteSideEffectFailure(error: unknown, userMessage: string, action: string) {
  reportError(error, {
    userMessage,
    context: { feature: 'notes', action },
    severity: 'warn',
    toast: false,
  });
}
