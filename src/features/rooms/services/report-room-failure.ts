import { reportError } from '@/lib/report-error';
import { toRoomError } from './room-errors';

export type ReportRoomOptions = {
  action: string;
  /** Falso quando a própria tela (janela, formulário) mostra a frase devolvida. */
  toast?: boolean;
};

/** Registra a falha (com o código, sem dado pessoal) e devolve a frase amigável. */
export function reportRoomFailure(error: unknown, { action, toast = false }: ReportRoomOptions) {
  const roomError = toRoomError(error);
  reportError(error, {
    userMessage: roomError.message,
    context: { feature: 'rooms', action, kind: roomError.kind, code: roomError.code },
    severity: roomError.kind === 'unknown' ? 'error' : 'warn',
    toast,
  });
  return roomError.message;
}

/** Para cargas que a tela mostra com ErrorState: registra no log e repassa a falha. */
export function logAndRethrow(action: string) {
  return (error: unknown): never => {
    reportRoomFailure(error, { action });
    throw error;
  };
}
