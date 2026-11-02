/**
 * Resultado das leituras (o mesmo MapResult do v1) e tradução dos erros do zod para PT-BR.
 * As mensagens são feitas para quem importa ou abre um mapa e precisa saber o que está errado.
 */
import { z } from 'zod';
import type { MapResult } from '../map-document';
import { MAX_REPORTED_ERRORS } from './constants';

export function ok<T>(value: T): MapResult<T> {
  return { ok: true, value };
}

/** Falha com as primeiras mensagens: lista longa de erros repetidos só atrapalha. */
export function fail(errors: readonly string[]): MapResult<never> {
  return { ok: false, errors: errors.slice(0, MAX_REPORTED_ERRORS) };
}

/** Texto em PT-BR para o que o zod não recebeu uma mensagem própria (tipo errado, campo ausente). */
const PORTUGUESE_ERRORS = z.locales.pt().localeError;

function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const where = issue.path.map(String).join('.');
    return where ? `${where}: ${issue.message}` : issue.message;
  });
}

/** Valida contra o schema e devolve o dado limpo (campos desconhecidos saem) ou as mensagens. */
export function parseWithSchema<T>(schema: z.ZodType<T>, input: unknown): MapResult<T> {
  const parsed = schema.safeParse(input, { error: PORTUGUESE_ERRORS });
  return parsed.success ? ok(parsed.data) : fail(describeIssues(parsed.error));
}
