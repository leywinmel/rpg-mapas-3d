import { createFailureReporter, type ReportFailureOptions } from '@/lib/report-feature-failure';
import { reportError } from '@/lib/report-error';
import { toNoteError } from './note-errors';

export type ReportNoteOptions = ReportFailureOptions;

export const reportNoteFailure = createFailureReporter('notes', toNoteError).report;

/** Para o que a cena não precisa mostrar: a ação principal já deu certo e a falha só vai para o log. */
export function reportNoteSideEffectFailure(error: unknown, userMessage: string, action: string) {
  reportError(error, {
    userMessage,
    context: { feature: 'notes', action },
    severity: 'warn',
    toast: false,
  });
}
