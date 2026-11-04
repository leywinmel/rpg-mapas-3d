import { z } from 'zod';
import { MAX_MAP_SIZE_V2 } from '@/domain/map-v2';

const coordinate = z
  .number()
  .int()
  .min(0)
  .max(MAX_MAP_SIZE_V2 - 1);
const cellSchema = z.object({ x: coordinate, z: coordinate });

/**
 * Mensagens do canal da mesa. Qualquer membro pode mandar lixo no canal: o que não confere é
 * ignorado [#51]. A altura nunca viaja: cada um põe a régua e o ping no chão que ele enxerga, e o
 * jogador não fica sabendo do relevo que a névoa esconde.
 */
export const rulerMessageSchema = z.object({
  userId: z.uuid(),
  mapId: z.uuid(),
  from: cellSchema,
  to: cellSchema,
});
export type RulerMessage = z.infer<typeof rulerMessageSchema>;

export const rulerClearedMessageSchema = z.object({ userId: z.uuid() });
export type RulerClearedMessage = z.infer<typeof rulerClearedMessageSchema>;

export const pingMessageSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  mapId: z.uuid(),
  cell: cellSchema,
});
export type PingMessage = z.infer<typeof pingMessageSchema>;
