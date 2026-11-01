import { useState } from 'react';
import { getAuthService, translateAuthError, useSession } from '@/features/auth';
import { reportError } from '@/lib/report-error';
import { useAsyncData, type AsyncData } from '@/lib/use-async-data';
import { parseRoomSlug } from '../schemas';
import { logAndRethrow, reportRoomFailure } from '../services/report-room-failure';
import { resolveRoomEntry } from '../services/room-entry';
import { getRoomsService } from '../services/rooms-service';
import type { RoomEntryState } from '../types';

/** Código que nem tem o formato de um link de mesa: não vale a pena perguntar ao banco. */
const INVALID_LINK: AsyncData<RoomEntryState> = { status: 'ready', data: { status: 'not-found' } };

export type JoinResult = { ok: true } | { ok: false; message: string };

/**
 * Fluxo de entrada na sala a partir do código do link: descobre se a pessoa já é
 * membro, se precisa de apelido ou de login, e faz a entrada.
 */
export function useRoomEntry(rawSlug: string | undefined) {
  const slug = parseRoomSlug(rawSlug);
  const session = useSession();
  const [joiningAsGuest, setJoiningAsGuest] = useState(false);
  // Enquanto o convidado nasce, a chave fica a de visitante: a tela de entrada continua
  // montada (com o botão carregando) em vez de piscar o pedido de apelido.
  const userId = joiningAsGuest ? null : (session.user?.id ?? null);
  const key = slug && session.status !== 'loading' ? `${slug}|${userId ?? 'visitante'}` : null;

  const entry = useAsyncData(key, () =>
    resolveRoomEntry({ slug: slug ?? '', userId, service: getRoomsService() }).catch(
      logAndRethrow('resolve-entry'),
    ),
  );

  async function joinAsMember(nickname: string): Promise<JoinResult> {
    if (!slug) return { ok: false, message: 'Link de mesa inválido.' };
    try {
      await getRoomsService().joinRoom({ slug, nickname });
      entry.reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: reportRoomFailure(error, { action: 'join' }) };
    }
  }

  async function joinAsGuest(nickname: string): Promise<JoinResult> {
    if (!slug) return { ok: false, message: 'Link de mesa inválido.' };
    setJoiningAsGuest(true);
    try {
      await getAuthService().signInAsGuest(nickname);
    } catch (error) {
      setJoiningAsGuest(false);
      const message = translateAuthError(error);
      reportError(error, {
        userMessage: message,
        context: { feature: 'rooms', action: 'guest-sign-in' },
        severity: 'warn',
        toast: false,
      });
      return { ok: false, message };
    }
    try {
      await getRoomsService().joinRoom({ slug, nickname });
      return { ok: true };
    } catch (error) {
      // A tela troca logo depois (o convidado já existe), então o aviso vai para o canto.
      return { ok: false, message: reportRoomFailure(error, { action: 'join', toast: true }) };
    } finally {
      setJoiningAsGuest(false);
    }
  }

  const state: AsyncData<RoomEntryState> = slug ? entry : INVALID_LINK;
  return { slug, state, reload: entry.reload, joinAsMember, joinAsGuest };
}
