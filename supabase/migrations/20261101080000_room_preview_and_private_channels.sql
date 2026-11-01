-- Convite e canais da mesa.
-- 1) Quem abre o link sem login já vê o nome da mesa.
-- 2) Os canais Realtime da mesa passam a ser privados: presença e avisos só
--    chegam a quem é membro, não a quem apenas descobriu o id da mesa.

-- ---------------------------------------------------------------------------
-- 1. Prévia do convite para visitante sem login
-- ---------------------------------------------------------------------------
-- O slug do link é o segredo da mesa (10 caracteres aleatórios, ~40 bits) e a
-- função devolve só id e nome. Qualquer pessoa já conseguia o mesmo criando uma
-- sessão anônima; sem a permissão, o visitante via um título genérico e um link
-- inválido só era detectado depois de criar um usuário anônimo à toa.
grant execute on function public.get_room_preview(text) to anon;

-- ---------------------------------------------------------------------------
-- 2. Canais privados da mesa
-- ---------------------------------------------------------------------------
-- Convenção do tópico: "<assunto>:<id da mesa>" (room:<id> hoje; dados, tokens
-- e outros assuntos da mesa reaproveitam a mesma regra). Tópico fora do padrão
-- vira null, e null nunca é mesa de ninguém.
create or replace function public.room_id_from_topic(p_topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  -- case garante a ordem: só converte para uuid o que já passou no padrão
  select case
    when p_topic ~ '^[a-z][a-z-]*:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_topic, ':', 2)::uuid
  end;
$$;

revoke execute on function public.room_id_from_topic(text) from public, anon;
grant execute on function public.room_id_from_topic(text) to authenticated;

-- O Realtime confere estas regras ao entrar no canal privado (receber) e ao
-- mandar broadcast ou presença (enviar). realtime.topic() é o canal em questão.
create policy "canais da mesa: membros recebem" on realtime.messages
  for select to authenticated
  using (public.is_room_member(public.room_id_from_topic(realtime.topic())));

create policy "canais da mesa: membros enviam" on realtime.messages
  for insert to authenticated
  with check (public.is_room_member(public.room_id_from_topic(realtime.topic())));
