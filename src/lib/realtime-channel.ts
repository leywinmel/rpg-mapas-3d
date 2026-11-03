import type { RealtimeChannel, RealtimeChannelOptions } from '@supabase/supabase-js';
import type { AppSupabaseClient } from './supabase';

/** Canal aberto, guardado para quem reabrir o mesmo nome logo em seguida. */
export type SharedChannelEntry<Handlers> = {
  channel: RealtimeChannel;
  client: AppSupabaseClient;
  /** Trocável: quem reabre o canal passa a receber os eventos sem assinar de novo. */
  handlers: Handlers;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

export type SharedChannelHandle<Handlers> = {
  entry: SharedChannelEntry<Handlers>;
  /** Fecha depois de um instante; reabrir o mesmo nome antes disso cancela o fechamento. */
  close: () => void;
};

export type AcquireChannelParams<Handlers> = {
  name: string;
  client: AppSupabaseClient;
  handlers: Handlers;
  config: RealtimeChannelOptions['config'];
  /**
   * Roda só quando o canal é criado (não numa reabertura): é onde entram os ouvintes e o
   * subscribe(). Os ouvintes têm de entrar ANTES do subscribe(): depois dele o Realtime
   * recusa e o canal quebra.
   */
  setup: (entry: SharedChannelEntry<Handlers>) => void;
};

export type ChannelRegistry<Handlers> = {
  acquire: (params: AcquireChannelParams<Handlers>) => SharedChannelHandle<Handlers>;
};

/**
 * O Supabase devolve o MESMO canal para o mesmo nome e só o desmonta depois de uma ida ao
 * servidor. Fechar e reabrir em seguida (o modo estrito do React faz isso) pegaria um canal
 * morrendo. Por isso o fechamento espera um instante e é cancelado se o canal for reaberto.
 * Cada feature cria o seu registro, tipado com os próprios ouvintes.
 */
export function createChannelRegistry<Handlers>(): ChannelRegistry<Handlers> {
  const openChannels = new Map<string, SharedChannelEntry<Handlers>>();

  function acquire(params: AcquireChannelParams<Handlers>): SharedChannelHandle<Handlers> {
    const { name, client, handlers, config, setup } = params;
    const reused = openChannels.get(name);
    if (reused?.closeTimer) clearTimeout(reused.closeTimer);

    const entry = reused ?? {
      channel: client.channel(name, { config }),
      client,
      handlers,
      closeTimer: null,
    };
    if (!reused) setup(entry);
    entry.handlers = handlers;
    entry.closeTimer = null;
    openChannels.set(name, entry);

    return {
      entry,
      close() {
        entry.closeTimer = setTimeout(() => {
          openChannels.delete(name);
          void entry.client.removeChannel(entry.channel);
        }, 0);
      },
    };
  }

  return { acquire };
}

/** Estados do canal que são falha de conexão (os demais são o ciclo normal). */
export function isChannelFailure(status: string): boolean {
  return status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
}

/** Envia um broadcast e falha se o servidor não aceitou, para quem avisa poder registrar. */
export async function sendBroadcast(
  channel: RealtimeChannel,
  event: string,
  payload: unknown,
): Promise<void> {
  const response = await channel.send({ type: 'broadcast', event, payload });
  if (response !== 'ok') throw new Error(`Aviso "${event}" não entregue: ${response}.`);
}
