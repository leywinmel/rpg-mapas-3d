-- RPG-8 a RPG-11 (F6): tokens no mapa v2 e névoa em pedaços.
--
-- 1) Tokens: casas até 1000×1000, tamanho em casas (1×1 a 4×4), degrau da base (level) no lugar
--    de elevation/scale, boneco 3D numa tabela de domínio, caminho da imagem conferido, token
--    dentro do mapa e dono que é membro da mesa.
-- 2) Névoa: o bitset ligado a maps.width (que só servia até 100×100) sai. A névoa passa a ser
--    guardada por pedaço de 32×32, como o mapa: só os pedaços que o mestre mexeu têm linha, e o
--    pedaço sem linha vale o padrão do mapa (tudo coberto ou tudo visível). O maior mapa cabe em
--    1024 linhas de 128 bytes.
-- 3) O jogador nunca recebe o que está coberto: pedaço todo coberto não sai do banco, pedaço em
--    parte coberto sai "recortado" (sem chão, paredes e peças das casas cobertas) e token coberto
--    não aparece. O mestre recebe tudo.
-- 4) save_map_fog grava a névoa numa transação só [#89].

-- ---------------------------------------------------------------------------
-- 1. Tokens
-- ---------------------------------------------------------------------------
-- Bonecos 3D embutidos: tabela de domínio, sem lista solta no código [#3][#6]. O app desenha cada
-- um com primitivas e as duas cores do token.
create table public.token_models (
  code  text primary key,
  label text not null
);
insert into public.token_models (code, label) values
  ('figure', 'Aventureiro'),
  ('creature', 'Criatura');
alter table public.token_models enable row level security;
create policy "dominio: leitura" on public.token_models for select to authenticated using (true);
revoke all on public.token_models from anon;

-- A F0 previa modelos soltos ("hero", "goblin") que nunca chegaram ao app.
update public.tokens set model_key = 'figure' where model_key is not null;
update public.token_templates set model_key = 'figure' where model_key is not null;

alter table public.tokens
  drop constraint tokens_x_check,
  drop constraint tokens_z_check,
  drop column elevation,
  drop column scale,
  -- Lado do token em casas: 1×1 (pessoa), 2×2 (ogro), 3×3, 4×4 (dragão).
  add column size integer not null default 1 constraint tokens_size_range check (size between 1 and 4),
  -- Degrau absoluto da base (o mesmo "level" das peças do mapa v2, até MAX_LEVEL = 255): é o que
  -- o corte de andares compara para esconder o token do andar de cima.
  add column level integer not null default 0 constraint tokens_level_range check (level between 0 and 255),
  add constraint tokens_x_range check (x between 0 and 999),
  add constraint tokens_z_range check (z between 0 and 999),
  add constraint tokens_model_fk foreign key (model_key) references public.token_models (code),
  -- Caminho no bucket token-images: "<id do dono>/<id do arquivo>.<extensão>", nada além disso.
  add constraint tokens_image_path_format check (
    image_path is null
    or image_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'
  );
alter table public.token_templates
  add constraint token_templates_model_fk foreign key (model_key) references public.token_models (code);

grant update (size, level) on public.tokens to authenticated;

-- O token precisa caber no mapa, e o dono precisa ser membro da mesa do mapa (o mestre escolhe
-- um jogador ou ninguém). Vale para o mestre também: é integridade, não permissão.
create or replace function public.check_token_placement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  map_width integer;
  map_depth integer;
  map_room  uuid;
begin
  select mp.width, mp.depth, mp.room_id into map_width, map_depth, map_room
    from public.maps mp where mp.id = new.map_id;
  if new.x + new.size > map_width or new.z + new.size > map_depth then
    raise exception 'O token precisa ficar dentro do mapa.' using errcode = '22023';
  end if;
  if new.owner_id is not null
     and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id)
     and not exists (select 1 from public.room_members m
                     where m.room_id = map_room and m.user_id = new.owner_id) then
    raise exception 'O dono do token precisa ser alguém da mesa.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger tokens_placement before insert or update on public.tokens
  for each row execute function public.check_token_placement();

-- O jogador dono só pode mexer em posição, andar, giro, vida atual e notas do próprio token.
create or replace function public.guard_token_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.can_edit_map(old.map_id) then
    return new;
  end if;
  if new.map_id is distinct from old.map_id
     or new.owner_id is distinct from old.owner_id
     or new.kind is distinct from old.kind
     or new.name is distinct from old.name
     or new.image_path is distinct from old.image_path
     or new.model_key is distinct from old.model_key
     or new.color_primary is distinct from old.color_primary
     or new.color_secondary is distinct from old.color_secondary
     or new.size is distinct from old.size
     or new.hp_max is distinct from old.hp_max
     or new.hidden is distinct from old.hidden then
    raise exception 'Jogador só pode mover o token e alterar vida e notas.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Névoa em pedaços
-- ---------------------------------------------------------------------------
-- O bitset antigo dependia da largura do mapa e não passava de 100×100; ninguém o gravava ainda.
alter table public.map_fog
  drop column covered,
  -- Pedaço sem linha em map_fog_chunks vale isto: "cobrir tudo" ou "revelar tudo" é trocar o
  -- padrão e apagar as linhas, sem gravar 1024 pedaços.
  add column default_covered boolean not null default false;

-- Um bit por casa do pedaço (1 = coberta), linha a linha: o bit (z local · 32 + x local), contando
-- da esquerda, como get_bit. A linha tem sempre 32 casas, mesmo no pedaço cortado da borda; os bits
-- de fora do mapa ficam 0 (save_map_fog zera). bit(1024) e não bytea: E e OU de bits e bit_count
-- prontos, e o texto "0101…" é simples de montar no app.
create table public.map_fog_chunks (
  map_id     uuid not null references public.map_fog (map_id) on delete cascade,
  cx         integer not null check (cx between 0 and 31),
  cz         integer not null check (cz between 0 and 31),
  covered    bit(1024) not null,
  updated_at timestamptz not null default now(),
  primary key (map_id, cx, cz)
);
create trigger map_fog_chunks_touch before update on public.map_fog_chunks
  for each row execute function public.touch_updated_at();

revoke all on public.map_fog_chunks from anon, authenticated;
grant select, delete on public.map_fog_chunks to authenticated;
grant insert (map_id, cx, cz, covered) on public.map_fog_chunks to authenticated;
grant update (covered) on public.map_fog_chunks to authenticated;
alter table public.map_fog_chunks enable row level security;

-- O jogador lê a névoa (é o que ele desenha por cima do mapa); só o mestre grava.
create policy "névoa em pedaços: quem vê o mapa vê" on public.map_fog_chunks
  for select to authenticated using (public.can_view_map(map_id));
create policy "névoa em pedaços: mestre grava" on public.map_fog_chunks
  for insert to authenticated with check (public.can_edit_map(map_id));
create policy "névoa em pedaços: mestre troca" on public.map_fog_chunks
  for update to authenticated
  using (public.can_edit_map(map_id)) with check (public.can_edit_map(map_id));
create policy "névoa em pedaços: mestre apaga" on public.map_fog_chunks
  for delete to authenticated using (public.can_edit_map(map_id));

-- Bits das casas que existem num pedaço de w×d casas (o da borda é menor que 32×32).
create or replace function public.fog_chunk_mask(p_width integer, p_depth integer)
returns bit(1024)
language sql
immutable
set search_path = ''
as $$
  select (repeat(repeat('1', p_width) || repeat('0', 32 - p_width), p_depth)
          || repeat('0', (32 - p_depth) * 32))::bit(1024);
$$;

-- Bits cobertos do pedaço, já cortados no mapa; nulo quando a névoa está desligada ou não existe.
create or replace function public.fog_chunk_bits(p_map uuid, p_cx integer, p_cz integer)
returns bit(1024)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(c.covered,
                  case when f.default_covered then ~(0::bit(1024)) else 0::bit(1024) end)
         & public.fog_chunk_mask(least(32, mp.width - p_cx * 32), least(32, mp.depth - p_cz * 32))
    from public.map_fog f
    join public.maps mp on mp.id = f.map_id
    left join public.map_fog_chunks c on c.map_id = f.map_id and c.cx = p_cx and c.cz = p_cz
   where f.map_id = p_map and f.enabled
     and p_cx * 32 < mp.width and p_cz * 32 < mp.depth;
$$;

-- 'clear' (nada coberto), 'mixed' (parte) ou 'covered' (todo coberto).
create or replace function public.fog_chunk_state(p_map uuid, p_cx integer, p_cz integer)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bits    bit(1024) := public.fog_chunk_bits(p_map, p_cx, p_cz);
  covered integer;
  total   integer;
begin
  if bits is null then
    return 'clear';
  end if;
  covered := bit_count(bits);
  if covered = 0 then
    return 'clear';
  end if;
  select least(32, mp.width - p_cx * 32) * least(32, mp.depth - p_cz * 32) into total
    from public.maps mp where mp.id = p_map;
  return case when covered >= total then 'covered' else 'mixed' end;
end;
$$;

-- Casa coberta pela névoa? Fora do mapa conta como coberta: nada de lá chega ao jogador.
create or replace function public.is_cell_covered(p_map uuid, p_x integer, p_z integer)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  map_width integer;
  map_depth integer;
  bits      bit(1024);
begin
  select mp.width, mp.depth into map_width, map_depth from public.maps mp where mp.id = p_map;
  if p_x < 0 or p_z < 0 or p_x >= map_width or p_z >= map_depth then
    return true;
  end if;
  bits := public.fog_chunk_bits(p_map, p_x / 32, p_z / 32);
  return bits is not null and get_bit(bits, (p_z % 32) * 32 + p_x % 32) = 1;
end;
$$;

-- Área quadrada (um token de size×size casas) toda coberta? Basta uma casa à vista para o token
-- aparecer: o ogro na beira da luz é visto, o que está inteiro no escuro não.
create or replace function public.is_area_covered(p_map uuid, p_x integer, p_z integer, p_size integer)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  for dz in 0 .. p_size - 1 loop
    for dx in 0 .. p_size - 1 loop
      if not public.is_cell_covered(p_map, p_x + dx, p_z + dz) then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;

-- A política dos tokens passa a olhar o tamanho, e o dono só vê o próprio token enquanto for da
-- mesa (quem saiu não recebe mais nada dela).
drop policy "tokens: ver o que não está escondido nem sob névoa" on public.tokens;
create policy "tokens: ver o que não está escondido nem sob névoa" on public.tokens
  for select to authenticated
  using (
    public.can_edit_map(map_id)
    or (public.can_view_map(map_id)
        and (owner_id = auth.uid()
             or (not hidden and not public.is_area_covered(map_id, x, z, size))))
  );
drop policy "tokens: mestre ou dono edita" on public.tokens;
create policy "tokens: mestre ou dono edita" on public.tokens
  for update to authenticated
  using (public.can_edit_map(map_id) or (owner_id = auth.uid() and public.can_view_map(map_id)))
  with check (public.can_edit_map(map_id) or (owner_id = auth.uid() and public.can_view_map(map_id)));

-- ---------------------------------------------------------------------------
-- 3. Pedaços do mapa sob a névoa
-- ---------------------------------------------------------------------------
-- O jogador lê direto só os pedaços sem nada coberto; os em parte cobertos vêm recortados por
-- get_fogged_map_chunks, e os todo cobertos não vêm (o app desenha o chão liso padrão, que não
-- conta segredo nenhum, e a névoa por cima).
drop policy "pedaços: quem vê o mapa vê os pedaços" on public.map_chunks;
create policy "pedaços: quem vê o mapa vê os pedaços sem névoa" on public.map_chunks
  for select to authenticated
  using (
    public.can_edit_map(map_id)
    or (public.can_view_map(map_id) and public.fog_chunk_state(map_id, cx, cz) = 'clear')
  );

-- Corridas [valor, quantidade, ...] para a lista de valores, casa a casa.
create or replace function public.fog_expand_runs(p_runs jsonb)
returns integer[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(pair.value order by pair.ord, step), '{}')
    from (
      select (p_runs -> (i * 2))::integer as value, (p_runs -> (i * 2 + 1))::integer as amount, i as ord
        from generate_series(0, jsonb_array_length(p_runs) / 2 - 1) as i
    ) pair
    cross join lateral generate_series(1, pair.amount) as step;
$$;

-- Lista de valores para corridas (a forma canônica do domínio: vizinhas nunca iguais).
create or replace function public.fog_encode_runs(p_values integer[])
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  runs    jsonb := '[]'::jsonb;
  current integer;
  amount  integer := 0;
begin
  for i in 1 .. coalesce(array_length(p_values, 1), 0) loop
    if amount > 0 and p_values[i] = current then
      amount := amount + 1;
    else
      if amount > 0 then
        runs := runs || jsonb_build_array(current, amount);
      end if;
      current := p_values[i];
      amount := 1;
    end if;
  end loop;
  if amount > 0 then
    runs := runs || jsonb_build_array(current, amount);
  end if;
  return runs;
end;
$$;

-- Casa coberta, olhando primeiro os bits do pedaço já carregados (a maioria das consultas cai no
-- próprio pedaço) e o banco só para as casas dos vizinhos ou de fora do mapa.
-- p_bounds = {x de origem, z de origem, largura, profundidade} do pedaço, já cortado no mapa.
create or replace function public.fog_cell_covered_near(
  p_map uuid, p_bits bit(1024), p_bounds integer[], p_x integer, p_z integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_x >= p_bounds[1] and p_x < p_bounds[1] + p_bounds[3]
     and p_z >= p_bounds[2] and p_z < p_bounds[2] + p_bounds[4] then
    return get_bit(p_bits, (p_z - p_bounds[2]) * 32 + (p_x - p_bounds[1])) = 1;
  end if;
  return public.is_cell_covered(p_map, p_x, p_z);
end;
$$;

-- Documento do pedaço sem o que está nas casas cobertas: chão vira buraco (altura 0), parede some
-- quando as duas casas dos lados estão cobertas, peça some quando todas as casas dela estão.
create or replace function public.redact_fogged_chunk(
  p_map uuid, p_cx integer, p_cz integer, p_document jsonb, p_bits bit(1024)
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  origin_x  integer := p_cx * 32;
  origin_z  integer := p_cz * 32;
  map_width integer;
  map_depth integer;
  bw        integer;
  bounds    integer[];
  tiles     integer[];
  heights   integer[];
  walls     jsonb := '[]'::jsonb;
  pieces    jsonb := '[]'::jsonb;
  item      jsonb;
  ix        integer;
  iz        integer;
  fw        integer;
  fd        integer;
  seen      boolean;
begin
  select mp.width, mp.depth into map_width, map_depth from public.maps mp where mp.id = p_map;
  bw := least(32, map_width - origin_x);
  bounds := array[origin_x, origin_z, bw, least(32, map_depth - origin_z)];
  tiles := public.fog_expand_runs(p_document -> 'terrain' -> 'tiles');
  heights := public.fog_expand_runs(p_document -> 'terrain' -> 'heights');
  for i in 1 .. coalesce(array_length(tiles, 1), 0) loop
    if get_bit(p_bits, ((i - 1) / bw) * 32 + (i - 1) % bw) = 1 then
      tiles[i] := 0;
      heights[i] := 0;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_document -> 'walls', '[]'::jsonb)) loop
    ix := (item ->> 'x')::integer;
    iz := (item ->> 'z')::integer;
    -- A parede "north" separa (x, z) de (x, z - 1); a "west", (x, z) de (x - 1, z).
    if not public.fog_cell_covered_near(p_map, p_bits, bounds, ix, iz)
       or (item ->> 'side' = 'north'
           and not public.fog_cell_covered_near(p_map, p_bits, bounds, ix, iz - 1))
       or (item ->> 'side' = 'west'
           and not public.fog_cell_covered_near(p_map, p_bits, bounds, ix - 1, iz)) then
      walls := walls || jsonb_build_array(item);
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_document -> 'pieces', '[]'::jsonb)) loop
    ix := (item ->> 'x')::integer;
    iz := (item ->> 'z')::integer;
    -- Girar um ou três quartos de volta troca largura e profundidade (pieceRect do domínio).
    if (item ->> 'rotation')::integer % 2 = 1 then
      fw := (item -> 'footprint' ->> 'depth')::integer;
      fd := (item -> 'footprint' ->> 'width')::integer;
    else
      fw := (item -> 'footprint' ->> 'width')::integer;
      fd := (item -> 'footprint' ->> 'depth')::integer;
    end if;
    seen := false;
    <<cells>>
    for dz in 0 .. fd - 1 loop
      for dx in 0 .. fw - 1 loop
        if not public.fog_cell_covered_near(p_map, p_bits, bounds, ix + dx, iz + dz) then
          seen := true;
          exit cells;
        end if;
      end loop;
    end loop;
    if seen then
      pieces := pieces || jsonb_build_array(item);
    end if;
  end loop;

  return jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(p_document, '{terrain,tiles}', public.fog_encode_runs(tiles)),
        '{terrain,heights}', public.fog_encode_runs(heights)),
      '{walls}', walls),
    '{pieces}', pieces);
end;
$$;

-- Pedaços em parte cobertos, recortados, para quem só vê o mapa. O mestre (quem edita) lê tudo
-- direto da tabela e recebe a lista vazia; quem não vê o mapa também.
create or replace function public.get_fogged_map_chunks(p_map_id uuid)
returns table (cx integer, cz integer, document jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.can_edit_map(p_map_id) or not public.can_view_map(p_map_id) then
    return;
  end if;
  return query
    select c.cx, c.cz,
           public.redact_fogged_chunk(p_map_id, c.cx, c.cz, c.document,
                                      public.fog_chunk_bits(p_map_id, c.cx, c.cz))
      from public.map_chunks c
     where c.map_id = p_map_id
       and public.fog_chunk_state(p_map_id, c.cx, c.cz) = 'mixed'
     order by c.cz, c.cx;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Gravação da névoa
-- ---------------------------------------------------------------------------
-- p_upserts: [{"cx": 0, "cz": 1, "covered": "0101…"(1024)}]; p_deletes: [{"cx": 2, "cz": 3}]
-- (pedaços que voltaram ao padrão). p_reset apaga todos os pedaços antes (cobrir ou revelar tudo).
-- Só mapa no v2: o v1 guarda o mapa inteiro em maps.document, que o jogador lê sem recorte.
-- "security invoker": as políticas acima valem para cada instrução.
create or replace function public.save_map_fog(
  p_map_id          uuid,
  p_enabled         boolean,
  p_default_covered boolean,
  p_upserts         jsonb default '[]'::jsonb,
  p_deletes         jsonb default '[]'::jsonb,
  p_reset           boolean default false
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  map_width   integer;
  map_depth   integer;
  map_version integer;
  saved_at    timestamptz;
begin
  select mp.width, mp.depth, mp.schema_version into map_width, map_depth, map_version
    from public.maps mp
   where mp.id = p_map_id and public.can_edit_map(mp.id);
  if not found then
    raise exception 'Só o mestre da mesa pode mexer na névoa.' using errcode = '42501';
  end if;
  if map_version < 2 then
    raise exception 'Salve o mapa antes de usar a névoa.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_upserts, '[]'::jsonb)) as u (cx integer, cz integer, covered text)
     where u.cx is null or u.cz is null or u.covered is null or char_length(u.covered) <> 1024 or u.covered ~ '[^01]'
        or u.cx < 0 or u.cz < 0 or u.cx * 32 >= map_width or u.cz * 32 >= map_depth
  ) then
    raise exception 'Pedaço de névoa fora do mapa ou malformado.' using errcode = '22023';
  end if;

  -- Trava a linha da névoa: duas gravações do mesmo mapa entram uma depois da outra.
  insert into public.map_fog (map_id, enabled, default_covered)
  values (p_map_id, p_enabled, p_default_covered)
  on conflict (map_id) do update
    set enabled = excluded.enabled, default_covered = excluded.default_covered, updated_at = now()
  returning updated_at into saved_at;

  if p_reset then
    delete from public.map_fog_chunks c where c.map_id = p_map_id;
  end if;
  -- Pedaços que ficaram fora do mapa depois de ele diminuir.
  delete from public.map_fog_chunks c
   where c.map_id = p_map_id and (c.cx * 32 >= map_width or c.cz * 32 >= map_depth);
  delete from public.map_fog_chunks c
   using jsonb_to_recordset(coalesce(p_deletes, '[]'::jsonb)) as d (cx integer, cz integer)
   where c.map_id = p_map_id and c.cx = d.cx and c.cz = d.cz;

  insert into public.map_fog_chunks (map_id, cx, cz, covered)
  select p_map_id, u.cx, u.cz,
         u.covered::bit(1024)
           & public.fog_chunk_mask(least(32, map_width - u.cx * 32), least(32, map_depth - u.cz * 32))
    from jsonb_to_recordset(coalesce(p_upserts, '[]'::jsonb)) as u (cx integer, cz integer, covered text)
  on conflict (map_id, cx, cz) do update set covered = excluded.covered;

  return saved_at;
end;
$$;

-- Funções internas da névoa: só as políticas e as funções acima as chamam.
revoke execute on function public.fog_chunk_bits(uuid, integer, integer) from public, anon;
revoke execute on function public.fog_chunk_state(uuid, integer, integer) from public, anon;
revoke execute on function public.is_area_covered(uuid, integer, integer, integer) from public, anon;
revoke execute on function public.fog_cell_covered_near(uuid, bit, integer[], integer, integer) from public, anon;
revoke execute on function public.redact_fogged_chunk(uuid, integer, integer, jsonb, bit) from public, anon;
revoke execute on function public.get_fogged_map_chunks(uuid) from public, anon;
revoke execute on function public.save_map_fog(uuid, boolean, boolean, jsonb, jsonb, boolean) from public, anon;
grant execute on function public.fog_chunk_bits(uuid, integer, integer) to authenticated;
grant execute on function public.fog_chunk_state(uuid, integer, integer) to authenticated;
grant execute on function public.is_area_covered(uuid, integer, integer, integer) to authenticated;
grant execute on function public.fog_cell_covered_near(uuid, bit, integer[], integer, integer) to authenticated;
grant execute on function public.redact_fogged_chunk(uuid, integer, integer, jsonb, bit) to authenticated;
grant execute on function public.get_fogged_map_chunks(uuid) to authenticated;
grant execute on function public.save_map_fog(uuid, boolean, boolean, jsonb, jsonb, boolean) to authenticated;
