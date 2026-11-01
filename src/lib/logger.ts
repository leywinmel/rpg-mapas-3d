/**
 * Log estruturado em JSON (fácil de filtrar quando houver coletor) com níveis
 * claros. E-mails são mascarados antes de qualquer saída: dado pessoal não vai
 * para log.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  level: LogLevel;
  message: string;
  time: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string };
};

export type LogSink = (entry: LogEntry) => void;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function maskPersonalData(text: string): string {
  return text.replace(EMAIL, '[email]');
}

function sanitize(value: unknown): unknown {
  if (typeof value === 'string') return maskPersonalData(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

/** Saída padrão: console do navegador, cada linha um JSON. */
const consoleSink: LogSink = (entry) => {
  const line = JSON.stringify(entry);
  if (entry.level === 'error') console.error(line);
  else if (entry.level === 'warn') console.warn(line);
  else if (entry.level === 'info') console.info(line);
  else console.debug(line);
};

let sink: LogSink = consoleSink;

/** Troca a saída (nos testes, ou para um coletor externo no futuro). */
export function setLogSink(next: LogSink): void {
  sink = next;
}

function describeError(error: unknown): LogEntry['error'] | undefined {
  if (error === undefined) return undefined;
  if (error instanceof Error) {
    return { name: error.name, message: maskPersonalData(error.message) };
  }
  return { name: 'NonError', message: maskPersonalData(String(error)) };
}

function write(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: unknown,
): void {
  const entry: LogEntry = {
    level,
    message: maskPersonalData(message),
    time: new Date().toISOString(),
  };
  if (context) entry.context = sanitize(context) as Record<string, unknown>;
  const described = describeError(error);
  if (described) entry.error = described;
  sink(entry);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>, error?: unknown) =>
    write('warn', message, context, error),
  error: (message: string, context?: Record<string, unknown>, error?: unknown) =>
    write('error', message, context, error),
};
