import { z } from 'zod';
import { DICE_SIDES, MAX_DICE_PER_ROLL, MAX_MODIFIER, MAX_NOTATION_LENGTH } from '@/domain';
import type { DieSides } from '@/domain';
import { throwSpecSchema, type ThrowSpec } from './physics/spec';

function isDieSides(value: number): value is DieSides {
  return (DICE_SIDES as readonly number[]).includes(value);
}

/** O formato guardado na coluna `results`: o que saiu em cada dado, na ordem da rolagem. */
export const storedResultsSchema = z
  .array(
    z
      .object({
        sides: z.number().refine(isDieSides, { message: 'Dado inexistente.' }),
        value: z.number().int().min(1),
      })
      .refine((die) => die.value <= die.sides, { message: 'Valor acima dos lados do dado.' }),
  )
  .min(1)
  .max(MAX_DICE_PER_ROLL);

export type StoredResults = z.infer<typeof storedResultsSchema>;

/** Mesmos limites das colunas de dice_rolls: confere antes de gravar. */
export const newRollSchema = z.object({
  roomId: z.guid(),
  rollerId: z.guid(),
  notation: z.string().min(1).max(MAX_NOTATION_LENGTH),
  results: storedResultsSchema,
  modifier: z.number().int().min(-MAX_MODIFIER).max(MAX_MODIFIER),
  total: z.number().int(),
  hidden: z.boolean(),
});

export type NewRollInput = z.input<typeof newRollSchema>;

/**
 * Aviso de arremesso que chega pelo canal da mesa. Qualquer membro pode mandar
 * qualquer coisa nele, então tudo é conferido antes de simular.
 */
export const throwMessageSchema = z.object({
  rollId: z.guid(),
  notation: z.string().min(1).max(MAX_NOTATION_LENGTH),
  spec: throwSpecSchema,
});

/** Escrito à mão (e não com z.infer) para manter o `spec` somente leitura como o resto. */
export type ThrowMessage = { rollId: string; notation: string; spec: ThrowSpec };
