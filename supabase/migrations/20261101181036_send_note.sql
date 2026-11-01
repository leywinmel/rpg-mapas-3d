-- RPG-12: envio das anotações do mestre.
-- 1) A imagem de uma anotação só pode morar na pasta da própria mesa.
-- 2) send_note grava a anotação e os destinatários numa transação só.
-- 3) O mestre enxerga os arquivos da pasta da própria mesa, para poder apagá-los.

-- ---------------------------------------------------------------------------
-- 1. Imagem sempre dentro da pasta da mesa
-- ---------------------------------------------------------------------------
-- O arquivo fica no bucket note-images em "<id da mesa>/<arquivo>". Como a leitura da
-- imagem depende de poder ler a anotação que aponta para ela, sem esta regra o mestre
-- de uma mesa poderia apontar a anotação para a imagem de outra mesa e entregá-la
-- aos próprios jogadores.
alter table public.notes
  add constraint notes_image_path_in_room_folder
  check (image_path is null or image_path ~ ('^' || room_id::text || '/[^/]+$'));

-- ---------------------------------------------------------------------------
-- 2. Envio atômico
-- ---------------------------------------------------------------------------
-- Com dois INSERTs soltos, o Realtime pode avaliar a leitura da anotação antes de os
-- destinatários existirem, e o jogador escolhido nunca receberia o aviso. Aqui os dois
-- entram na mesma transação: quem escuta só enxerga a anotação já com os destinatários.
--
-- "security invoker" de propósito: as políticas (RLS) valem para os dois INSERTs, então
-- só o mestre da mesa envia e só membros da mesa viram destinatários. Qualquer falha
-- desfaz tudo.
--
-- Os valores padrão existem para o gerador de tipos aceitar a omissão do caminho da
-- imagem (sem anexo). O de p_to_all é falso para que esquecê-lo nunca mande um segredo
-- para a mesa toda: sem destinatário, a função recusa.
create or replace function public.send_note(
  p_room_id       uuid,
  p_title         text,
  p_body          text,
  p_image_path    text    default null,
  p_to_all        boolean default false,
  p_recipient_ids uuid[]  default '{}'
)
returns public.notes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id   uuid := gen_random_uuid();
  new_note public.notes;
begin
  if not p_to_all and coalesce(cardinality(p_recipient_ids), 0) = 0 then
    raise exception 'Escolha ao menos um jogador para receber a anotação.' using errcode = '22023';
  end if;

  -- O id nasce aqui, e a linha é lida num SELECT à parte: um INSERT ... RETURNING confere
  -- a política de leitura com a visão da própria instrução, que ainda não enxerga a
  -- anotação recém-criada (can_read_note olha a tabela).
  insert into public.notes (id, room_id, author_id, title, body, image_path, to_all)
  values (new_id, p_room_id, auth.uid(), p_title, coalesce(p_body, ''), p_image_path, p_to_all);

  -- Para a mesa toda não há destinatários: a lista, se vier, é ignorada. Repetidos e
  -- nulos também (um destinatário só entra uma vez).
  if not p_to_all then
    insert into public.note_recipients (note_id, user_id)
    select distinct new_id, chosen.user_id
    from unnest(p_recipient_ids) as chosen (user_id)
    where chosen.user_id is not null;
  end if;

  select * into new_note from public.notes n where n.id = new_id;
  return new_note;
end;
$$;

revoke execute on function public.send_note(uuid, text, text, text, boolean, uuid[]) from public, anon;
grant execute on function public.send_note(uuid, text, text, text, boolean, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. O mestre enxerga os arquivos da pasta da própria mesa
-- ---------------------------------------------------------------------------
-- A leitura da imagem dependia de existir uma anotação apontando para ela, e o Storage só
-- apaga o que o RLS deixa ver. Ao apagar uma anotação (primeiro a linha, depois o arquivo),
-- a imagem ficava invisível para todos, até para o mestre, e sobrava no bucket para sempre.
-- Agora o mestre da mesa vê tudo o que está na pasta dela; os jogadores continuam vendo só
-- a imagem das anotações que podem ler.
-- O case só converte para uuid o que já tem o formato de um (pasta fora do padrão não derruba
-- a consulta de ninguém).
drop policy "imagens de anotação: destinatários leem" on storage.objects;

create policy "imagens de anotação: mestre e destinatários leem" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'note-images'
    and (
      public.is_room_gm(
        case
          when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then ((storage.foldername(name))[1])::uuid
        end
      )
      or exists (
        select 1 from public.notes n
        where n.image_path = storage.objects.name and public.can_read_note(n.id)
      )
    )
  );
