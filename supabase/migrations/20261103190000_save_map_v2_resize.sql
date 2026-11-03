-- RPG-25 (F13a): mudar o tamanho de um mapa v2 na mesma gravação dos pedaços.
--
-- O editor muda o tamanho como qualquer outra edição (entra no desfazer e no autosave). A
-- gravação passa a levar o tamanho novo: save_map_v2 troca maps.width e maps.depth, confere os
-- pedaços contra o tamanho NOVO e apaga as linhas dos pedaços que ficaram fora do mapa, tudo
-- na mesma transação. Sem p_width e p_depth o tamanho fica como está (o pedido de antes).
--
-- A assinatura muda (dois parâmetros a mais), então a função antiga sai: duas versões com
-- parâmetros opcionais deixariam a chamada ambígua.
drop function public.save_map_v2(uuid, jsonb, jsonb, jsonb);

create function public.save_map_v2(
  p_map_id  uuid,
  p_header  jsonb,
  p_upserts jsonb default '[]'::jsonb,
  p_deletes jsonb default '[]'::jsonb,
  p_width   integer default null,
  p_depth   integer default null
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- Lado do pedaço em casas: o CHUNK_SIZE de src/domain/map-v2/constants.ts.
  chunk_size  constant integer := 32;
  -- Lado máximo do mapa v2: o MAX_MAP_SIZE_V2 do domínio e o check de maps.width/depth.
  max_side    constant integer := 1000;
  map_width   integer;
  map_depth   integer;
  map_version integer;
  saved_at    timestamptz;
begin
  -- Trava a linha do mapa: duas gravações do mesmo mapa entram uma depois da outra.
  select mp.width, mp.depth, mp.schema_version
    into map_width, map_depth, map_version
    from public.maps mp
   where mp.id = p_map_id and public.can_edit_map(mp.id)
     for update;
  if not found then
    raise exception 'Só o mestre da mesa pode editar este mapa.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_header) is distinct from 'object' or p_header -> 'version' is distinct from '2'::jsonb then
    raise exception 'O cabeçalho do mapa precisa ser da versão 2.' using errcode = '22023';
  end if;

  map_width := coalesce(p_width, map_width);
  map_depth := coalesce(p_depth, map_depth);
  if map_width not between 1 and max_side or map_depth not between 1 and max_side then
    raise exception 'O mapa precisa ter de 1 a 1000 casas por lado.' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_to_recordset(coalesce(p_upserts, '[]'::jsonb)) as u (cx integer, cz integer, document jsonb)
     where u.cx is null or u.cz is null or u.document is null
        or u.cx * chunk_size >= map_width or u.cz * chunk_size >= map_depth
  ) then
    raise exception 'Pedaço fora do mapa ou sem documento.' using errcode = '22023';
  end if;

  if map_version < 2 then
    delete from public.map_chunks c where c.map_id = p_map_id;
  end if;

  -- Pedaços que o tamanho novo deixou de fora (nada sai quando o tamanho não muda).
  delete from public.map_chunks c
   where c.map_id = p_map_id
     and (c.cx * chunk_size >= map_width or c.cz * chunk_size >= map_depth);

  delete from public.map_chunks c
   using jsonb_to_recordset(coalesce(p_deletes, '[]'::jsonb)) as d (cx integer, cz integer)
   where c.map_id = p_map_id and c.cx = d.cx and c.cz = d.cz;

  insert into public.map_chunks (map_id, cx, cz, document)
  select p_map_id, u.cx, u.cz, u.document
    from jsonb_to_recordset(coalesce(p_upserts, '[]'::jsonb)) as u (cx integer, cz integer, document jsonb)
  on conflict (map_id, cx, cz) do update set document = excluded.document;

  -- O cabeçalho é regravado sempre: a linha de maps mudar é o aviso que o tempo real manda
  -- para a mesa recarregar o mapa (a mesa não escuta map_chunks).
  update public.maps mp
     set document = p_header, schema_version = 2, width = map_width, depth = map_depth
   where mp.id = p_map_id
  returning mp.updated_at into saved_at;
  return saved_at;
end;
$$;

revoke execute on function public.save_map_v2(uuid, jsonb, jsonb, jsonb, integer, integer) from public, anon;
grant execute on function public.save_map_v2(uuid, jsonb, jsonb, jsonb, integer, integer) to authenticated;
