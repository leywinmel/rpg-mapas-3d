/**
 * Formulário "Gerar vila ou cidade": validação com zod (os mesmos limites do gerador) e os
 * valores que um exemplo pronto preenche.
 */
import { z } from 'zod';
import {
  MAX_SEED,
  SETTLEMENT_STYLES,
  SIZE_PRESETS,
  sizePreset,
  type ExampleMap,
  type SettlementStyle,
  type SizePresetId,
} from '@/domain/map-gen';
import type { GridSize } from '@/domain';
import { mapNameSchema, type FormResult } from '../editor/map-list';

const presetIds = SIZE_PRESETS.map((preset) => preset.id) as [SizePresetId, ...SizePresetId[]];

export const generateMapSchema = z.object({
  name: mapNameSchema,
  style: z.enum(SETTLEMENT_STYLES as [SettlementStyle, ...SettlementStyle[]]),
  preset: z.enum(presetIds),
  seed: z.coerce
    .number({ message: 'A semente precisa ser um número.' })
    .int('A semente precisa ser um número inteiro.')
    .min(0, 'A semente não pode ser negativa.')
    .max(MAX_SEED, `Use uma semente de 0 a ${MAX_SEED}.`),
});

export type GenerateMapInput = z.infer<typeof generateMapSchema>;
export type GenerateFormValues = Record<keyof GenerateMapInput, string>;
export type GenerateFieldErrors = Partial<Record<keyof GenerateMapInput, string>>;

export function parseGenerateMap(
  values: GenerateFormValues,
): FormResult<GenerateMapInput, GenerateFieldErrors> {
  const parsed = generateMapSchema.safeParse(values);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: GenerateFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof GenerateMapInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

export function presetSize(id: SizePresetId): GridSize {
  const { side } = sizePreset(id);
  return { width: side, depth: side };
}

/** Semente nova para o botão "Sortear" (a aleatoriedade fica fora do gerador, que é puro). */
export function randomSeed(random: () => number = Math.random): number {
  return Math.floor(random() * (MAX_SEED + 1));
}

export function exampleValues(example: ExampleMap): GenerateFormValues {
  return {
    name: example.name,
    style: example.style,
    preset: example.preset,
    seed: String(example.seed),
  };
}
