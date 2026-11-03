-- RPG-25 (F11): mapa no formato v2, gravado em pedaços.
-- 1) Mapas de até 1000×1000 casas; maps.schema_version diz se o mapa está no v1 ou no v2.
-- 2) Tabela map_chunks: um pedaço de 32×32 casas por linha, só os que fogem do chão liso.
-- 3) Regras de acesso de map_chunks, iguais às do mapa.
-- 4) save_map_v2: grava pedaços e cabeçalho numa transação só.
--
-- No v2, maps.document guarda só o cabeçalho ({"version": 2, "ambience": ...}) e cada pedaço
-- mexido ganha uma linha em map_chunks. Pedaço sem linha vale como o chão liso padrão (decisão
-- 14 do usuário, em 03/11): criar um mapa de 1000×1000 é gravar só o cabeçalho.

-- ---------------------------------------------------------------------------
-- 1. Tamanho e versão do mapa
-- ---------------------------------------------------------------------------
-- O v1 guarda o mapa inteiro em maps.document (uma linha de JSON por casa), por isso continua
-- limitado a 100×100; só o v2, que guarda em pedaços, chega a 1000×1000 (decisão 1, de 01/11).
alter table public.maps drop constraint maps_width_check;
alter table public.maps drop constraint maps_depth_check;
alter table public.maps
  add constraint maps_width_check check (width between 1 and 1000),
  add constraint maps_depth_check check (depth between 1 and 1000),
  add constraint maps_v1_size check (schema_version >= 2 or (width <= 100 and depth <= 100)),
  -- A versão do documento e a da coluna andam juntas: o editor antigo (v1) gravando por cima
  -- de um mapa já convertido falha alto, em vez de deixar um cabeçalho v1 com pedaços v2.
  add constraint maps_document_version check (
    not (document ? 'version') or document -> 'version' = to_jsonb(schema_version)
  );

-- ---------------------------------------------------------------------------
-- 2. Pedaços do mapa
-- ---------------------------------------------------------------------------
-- cx e cz vão de 0 a 31: ceil(1000 / 32) = 32 pedaços por lado no maior mapa. Que o pedaço
-- caiba no tamanho deste mapa (o de 40×40 só tem 2×2) quem confere é save_map_v2; o app
-- confere de novo ao ler (loadMapModel).
--
-- Limite do documento: o pior pedaço que o domínio aceita (1024 peças de chão diferentes, 4096
-- paredes e 2048 peças, todas com os textos mais longos) mede 1.017.853 caracteres de JSON e
-- 1.446.032 bytes em jsonb (medido no Postgres local em 03/11). 1,5 MB deixa esse caso passar e
-- ainda barra quem tentar encher o banco gratuito [#65]. Se os limites por pedaço do domínio
-- (constants.ts) subirem, este número precisa subir junto.
create table public.map_chunks (
  map_id     uuid not null references public.maps (id) on delete cascade,
  cx         integer not null check (cx between 0 and 31),
  cz         integer not null check (cz between 0 and 31),
  document   jsonb not null check (jsonb_typeof(document) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (map_id, cx, cz),
  constraint map_chunks_document_size check (pg_column_size(document) <= 1500000)
);
-- A chave primária começa por map_id: ler todos os pedaços de um mapa já usa o índice dela.
create trigger map_chunks_touch before update on public.map_chunks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Quem lê e quem grava
-- ---------------------------------------------------------------------------
-- O mesmo que o mapa: quem vê o mapa (dono ou membro da mesa) lê os pedaços; só quem edita o
-- mapa (dono ou mestre da mesa) grava e apaga. Mapa da biblioteca (sem mesa) é só do dono.
-- Sem login (anon) não há acesso nenhum. Só o documento muda numa linha existente: mover um
-- pedaço de lugar ou de mapa é apagar e gravar de novo.
revoke all on public.map_chunks from anon, authenticated;
grant select, delete on public.map_chunks to authenticated;
grant insert (map_id, cx, cz, document) on public.map_chunks to authenticated;
grant update (document) on public.map_chunks to authenticated;

alter table public.map_chunks enable row level security;

create policy "pedaços: quem vê o mapa vê os pedaços" on public.map_chunks
  for select to authenticated using (public.can_view_map(map_id));
create policy "pedaços: quem edita o mapa grava" on public.map_chunks
  for insert to authenticated with check (public.can_edit_map(map_id));
create policy "pedaços: quem edita o mapa troca" on public.map_chunks
  for update to authenticated
  using (public.can_edit_map(map_id)) with check (public.can_edit_map(map_id));
create policy "pedaços: quem edita o mapa apaga" on public.map_chunks
  for delete to authenticated using (public.can_edit_map(map_id));

-- ---------------------------------------------------------------------------
-- 4. Gravação atômica
-- ---------------------------------------------------------------------------
-- Pedaços e cabeçalho entram juntos ou nada entra: uma gravação pela metade deixaria o mapa
-- com metade de uma pincelada, e a primeira gravação de um mapa do v1 trocaria a versão sem
-- os pedaços. "security invoker": as políticas acima valem para cada instrução.
--
-- p_upserts: [{"cx": 0, "cz": 1, "document": {...}}, ...] para inserir ou trocar.
-- p_deletes: [{"cx": 2, "cz": 3}, ...] para apagar (pedaços que voltaram ao chão liso).
--
-- O cabeçalho é regravado sempre: a linha de maps mudar é o aviso que o tempo real manda para
-- a mesa recarregar o mapa (a mesa não escuta map_chunks), e updated_at marca a última edição.
-- Mapa ainda no v1: os pedaços antigos (que não deveriam existir) saem antes, e o mapa passa
-- para o v2 com exatamente os pedaços desta gravação.
create or replace function public.save_map_v2(
  p_map_id  uuid,
  p_header  jsonb,
  p_upserts jsonb default '[]'::jsonb,
  p_deletes jsonb default '[]'::jsonb
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- Lado do pedaço em casas: o CHUNK_SIZE de src/domain/map-v2/constants.ts.
  chunk_size  constant integer := 32;
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

  delete from public.map_chunks c
   using jsonb_to_recordset(coalesce(p_deletes, '[]'::jsonb)) as d (cx integer, cz integer)
   where c.map_id = p_map_id and c.cx = d.cx and c.cz = d.cz;

  insert into public.map_chunks (map_id, cx, cz, document)
  select p_map_id, u.cx, u.cz, u.document
    from jsonb_to_recordset(coalesce(p_upserts, '[]'::jsonb)) as u (cx integer, cz integer, document jsonb)
  on conflict (map_id, cx, cz) do update set document = excluded.document;

  update public.maps mp
     set document = p_header, schema_version = 2
   where mp.id = p_map_id
  returning mp.updated_at into saved_at;
  return saved_at;
end;
$$;

revoke execute on function public.save_map_v2(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_map_v2(uuid, jsonb, jsonb, jsonb) to authenticated;
