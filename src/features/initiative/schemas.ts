import { z } from 'zod';
import { INITIATIVE_VALUE_MAX, INITIATIVE_VALUE_MIN, MAX_INITIATIVE_LABEL_LENGTH } from '@/domain';

/** Linha de initiative_entries com o dono do token (nulo quando o RLS esconde o token). */
export const initiativeRowSchema = z.object({
  id: z.uuid(),
  token_id: z.uuid().nullable(),
  label: z.string(),
  value: z.number().int(),
  position: z.number().int(),
  is_current: z.boolean(),
  hidden: z.boolean(),
  token: z.object({ owner_id: z.uuid().nullable() }).nullable(),
});
export type InitiativeRow = z.infer<typeof initiativeRowSchema>;

export const initiativeRoundSchema = z.object({ initiative_round: z.number().int().min(0) });

/** Valor digitado no painel: inteiro na faixa do banco [#51]. */
export const initiativeValueSchema = z.coerce
  .number({ error: 'Digite um número.' })
  .int('Use um número inteiro.')
  .min(INITIATIVE_VALUE_MIN, `O menor valor é ${INITIATIVE_VALUE_MIN}.`)
  .max(INITIATIVE_VALUE_MAX, `O maior valor é ${INITIATIVE_VALUE_MAX}.`);

export const initiativeLabelSchema = z
  .string()
  .trim()
  .min(1, 'Dê um nome para a entrada.')
  .max(MAX_INITIATIVE_LABEL_LENGTH, `Use até ${MAX_INITIATIVE_LABEL_LENGTH} letras.`);
