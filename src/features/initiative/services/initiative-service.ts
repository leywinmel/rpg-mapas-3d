import type { Database } from '@/lib/database.types';
import { getSupabase, type AppSupabaseClient } from '@/lib/supabase';
import { initiativeRoundSchema, initiativeRowSchema, type InitiativeRow } from '../schemas';
import type {
  InitiativeBoard,
  InitiativeItem,
  InitiativePatch,
  NewInitiativeEntry,
} from '../types';
import { InitiativeError, toInitiativeError } from './initiative-errors';

type EntryUpdate = Database['public']['Tables']['initiative_entries']['Update'];

/** O dono vem do token pelo RLS: token que esta pessoa não vê nem traz a entrada. */
const ENTRY_COLUMNS =
  'id, token_id, label, value, position, is_current, hidden, token:tokens(owner_id)';

export function toInitiativeItem(row: InitiativeRow): InitiativeItem {
  return {
    id: row.id,
    tokenId: row.token_id,
    ownerId: row.token?.owner_id ?? null,
    label: row.label,
    value: row.value,
    position: row.position,
    isCurrent: row.is_current,
    hidden: row.hidden,
  };
}

/** Só as colunas do que mudou: o jogador dono manda só o valor, que é o que o gatilho deixa. */
function toUpdateRow(patch: InitiativePatch): EntryUpdate {
  const row: EntryUpdate = {};
  if (patch.label !== undefined) row.label = patch.label;
  if (patch.value !== undefined) row.value = patch.value;
  if (patch.hidden !== undefined) row.hidden = patch.hidden;
  if (patch.position !== undefined) row.position = patch.position;
  return row;
}

export type InitiativeService = {
  /** A ordem que esta pessoa vê (o RLS tira o escondido e o que está sob a névoa) e a rodada. */
  load: (roomId: string) => Promise<InitiativeBoard>;
  add: (
    roomId: string,
    entries: readonly (NewInitiativeEntry & { position: number })[],
  ) => Promise<void>;
  update: (entryId: string, patch: InitiativePatch) => Promise<void>;
  /** Várias posições de uma vez (desempate do mestre). */
  reorder: (changes: readonly { id: string; position: number }[]) => Promise<void>;
  remove: (entryId: string) => Promise<void>;
  setTurn: (roomId: string, turn: { currentId: string | null; round: number }) => Promise<void>;
  clear: (roomId: string) => Promise<void>;
};

async function run<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw toInitiativeError(error);
  return data;
}

export function createInitiativeService(client: AppSupabaseClient): InitiativeService {
  const table = () => client.from('initiative_entries');
  return {
    async load(roomId) {
      const [rows, room] = await Promise.all([
        run(table().select(ENTRY_COLUMNS).eq('room_id', roomId)),
        run(client.from('rooms').select('initiative_round').eq('id', roomId).single()),
      ]);
      return {
        entries: (rows ?? []).map((row) => toInitiativeItem(initiativeRowSchema.parse(row))),
        round: initiativeRoundSchema.parse(room).initiative_round,
      };
    },
    async add(roomId, entries) {
      await run(
        table().insert(
          entries.map((entry) => ({
            room_id: roomId,
            token_id: entry.tokenId,
            label: entry.label,
            value: entry.value,
            hidden: entry.hidden,
            position: entry.position,
          })),
        ),
      );
    },
    async update(entryId, patch) {
      // O RLS não dá erro quando a linha não é de quem pede: só não acha nada. Nada de falha calada.
      const rows = await run(table().update(toUpdateRow(patch)).eq('id', entryId).select('id'));
      if (!rows || rows.length === 0) throw new InitiativeError('forbidden', null);
    },
    async reorder(changes) {
      await Promise.all(
        changes.map((change) =>
          run(table().update({ position: change.position }).eq('id', change.id)),
        ),
      );
    },
    async remove(entryId) {
      await run(table().delete().eq('id', entryId));
    },
    async setTurn(roomId, { currentId, round }) {
      await run(
        client.rpc('set_initiative_turn', {
          p_room_id: roomId,
          p_round: round,
          ...(currentId ? { p_current: currentId } : {}),
        }),
      );
    },
    async clear(roomId) {
      await run(client.rpc('clear_initiative', { p_room_id: roomId }));
    },
  };
}

let shared: InitiativeService | null = null;

/** Serviço padrão, ligado ao cliente do Supabase do app (os testes injetam outro) [#20][#45]. */
export function getInitiativeService(): InitiativeService {
  shared ??= createInitiativeService(getSupabase());
  return shared;
}
