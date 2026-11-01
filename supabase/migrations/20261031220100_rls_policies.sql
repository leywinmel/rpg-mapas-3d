-- RPG-1: regras de acesso (RLS) e funções da mesa.
-- Princípio: cada um vê e altera só o que precisa [#55].
--   * Mestre gerencia a mesa, os mapas, a névoa, as anotações e a iniciativa.
--   * Jogador move e edita só os próprios tokens (posição, vida, notas).
--   * Anotação só chega a quem foi destinatário.
--   * Rolagem escondida só o mestre (e quem rolou) vê.
--   * Token escondido ou sob a névoa não chega ao navegador do jogador.
-- Convidados entram com login anônimo do Supabase: são usuários "authenticated"
-- com is_anonymous = true. Quem não fez login nenhum (papel anon) não acessa nada.

-- ---------------------------------------------------------------------------
-- Funções auxiliares (security definer evita recursão de RLS em room_members)
-- ---------------------------------------------------------------------------
create or replace function public.is_registered()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

create or replace function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_room_gm(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room and m.user_id = auth.uid() and m.role = 'gm'
  );
$$;

create or replace function public.shares_room_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members me
    join public.room_members other on other.room_id = me.room_id
    where me.user_id = auth.uid() and other.user_id = p_user
  );
$$;

create or replace function public.can_view_map(p_map uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.maps mp
    where mp.id = p_map
      and (mp.owner_id = auth.uid()
           or (mp.room_id is not null and public.is_room_member(mp.room_id)))
  );
$$;

create or replace function public.can_edit_map(p_map uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.maps mp
    where mp.id = p_map
      and (mp.owner_id = auth.uid()
           or (mp.room_id is not null and public.is_room_gm(mp.room_id)))
  );
$$;

-- Casa coberta pela névoa? Bit n = casa (z * largura + x); bit 0 é o menos
-- significativo do primeiro byte (mesma convenção de get_bit e do domínio no app).
create or replace function public.is_cell_covered(p_map uuid, p_x integer, p_z integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select f.enabled
       and (p_z * mp.width + p_x) < octet_length(f.covered) * 8
       and get_bit(f.covered, p_z * mp.width + p_x) = 1
    from public.map_fog f
    join public.maps mp on mp.id = f.map_id
    where f.map_id = p_map
  ), false);
$$;

create or replace function public.note_room_id(p_note uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select n.room_id from public.notes n where n.id = p_note;
$$;

create or replace function public.can_read_note(p_note uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.notes n
    where n.id = p_note
      and (public.is_room_gm(n.room_id)
           or (public.is_room_member(n.room_id)
               and (n.to_all
                    or exists (select 1 from public.note_recipients r
                               where r.note_id = n.id and r.user_id = auth.uid()))))
  );
$$;

-- ---------------------------------------------------------------------------
-- Permissões de tabela: anon (sem login) não acessa nada; colunas sensíveis
-- só mudam pelas colunas liberadas abaixo.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke update on public.rooms, public.room_members, public.maps, public.tokens from authenticated;
grant update (name, active_map_id) on public.rooms to authenticated;
grant update (nickname) on public.room_members to authenticated;
grant update (name, width, depth, schema_version, document, sort_order, room_id) on public.maps to authenticated;
grant update (owner_id, kind, name, image_path, model_key, color_primary, color_secondary,
              x, z, elevation, rotation, scale, hp_current, hp_max, notes, hidden)
  on public.tokens to authenticated;

alter table public.member_roles       enable row level security;
alter table public.token_kinds        enable row level security;
alter table public.profiles           enable row level security;
alter table public.rooms              enable row level security;
alter table public.room_members       enable row level security;
alter table public.maps               enable row level security;
alter table public.map_assets         enable row level security;
alter table public.token_templates    enable row level security;
alter table public.tokens             enable row level security;
alter table public.map_fog            enable row level security;
alter table public.notes              enable row level security;
alter table public.note_recipients    enable row level security;
alter table public.dice_rolls         enable row level security;
alter table public.initiative_entries enable row level security;

-- Domínio: leitura livre para quem está logado
create policy "dominio: leitura" on public.member_roles for select to authenticated using (true);
create policy "dominio: leitura" on public.token_kinds  for select to authenticated using (true);

-- Perfis
create policy "perfis: ver o próprio e de quem divide mesa" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_room_with(id));
create policy "perfis: editar o próprio" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Mesas (criação só pela função create_room)
create policy "mesas: membros veem" on public.rooms
  for select to authenticated using (public.is_room_member(id));
create policy "mesas: mestre edita" on public.rooms
  for update to authenticated
  using (public.is_room_gm(id))
  with check (
    public.is_room_gm(id)
    and (active_map_id is null
         or exists (select 1 from public.maps mp where mp.id = active_map_id and mp.room_id = rooms.id))
  );
create policy "mesas: dono apaga" on public.rooms
  for delete to authenticated using (owner_id = auth.uid());

-- Membros (entrada só pelas funções create_room/join_room)
create policy "membros: membros veem" on public.room_members
  for select to authenticated using (public.is_room_member(room_id));
create policy "membros: trocar o próprio apelido" on public.room_members
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "membros: sair ou mestre remove" on public.room_members
  for delete to authenticated
  using ((user_id = auth.uid() and role <> 'gm') or (public.is_room_gm(room_id) and user_id <> auth.uid()));

-- Mapas
create policy "mapas: dono e membros da mesa veem" on public.maps
  for select to authenticated
  using (owner_id = auth.uid() or (room_id is not null and public.is_room_member(room_id)));
create policy "mapas: conta registrada cria" on public.maps
  for insert to authenticated
  with check (
    public.is_registered() and owner_id = auth.uid()
    and (room_id is null or public.is_room_gm(room_id))
  );
create policy "mapas: dono ou mestre edita" on public.maps
  for update to authenticated
  using (owner_id = auth.uid() or (room_id is not null and public.is_room_gm(room_id)))
  with check (
    (owner_id = auth.uid() or (room_id is not null and public.is_room_gm(room_id)))
    and (room_id is null or public.is_room_gm(room_id))
  );
create policy "mapas: dono ou mestre apaga" on public.maps
  for delete to authenticated
  using (owner_id = auth.uid() or (room_id is not null and public.is_room_gm(room_id)));

-- Modelos .glb: o dono gerencia; quem joga numa mesa desse mestre consegue ler
create policy "modelos: dono e jogadores do mestre veem" on public.map_assets
  for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.room_members gm
      join public.room_members me on me.room_id = gm.room_id
      where gm.user_id = map_assets.owner_id and gm.role = 'gm' and me.user_id = auth.uid()
    )
  );
create policy "modelos: conta registrada envia" on public.map_assets
  for insert to authenticated with check (public.is_registered() and owner_id = auth.uid());
create policy "modelos: dono apaga" on public.map_assets
  for delete to authenticated using (owner_id = auth.uid());

-- Biblioteca de tokens: só o dono
create policy "modelos de token: dono vê" on public.token_templates
  for select to authenticated using (owner_id = auth.uid());
create policy "modelos de token: conta registrada cria" on public.token_templates
  for insert to authenticated with check (public.is_registered() and owner_id = auth.uid());
create policy "modelos de token: dono edita" on public.token_templates
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "modelos de token: dono apaga" on public.token_templates
  for delete to authenticated using (owner_id = auth.uid());

-- Tokens
create policy "tokens: ver o que não está escondido nem sob névoa" on public.tokens
  for select to authenticated
  using (
    public.can_edit_map(map_id)
    or owner_id = auth.uid()
    or (public.can_view_map(map_id) and not hidden and not public.is_cell_covered(map_id, x, z))
  );
create policy "tokens: mestre cria" on public.tokens
  for insert to authenticated with check (public.can_edit_map(map_id));
create policy "tokens: mestre ou dono edita" on public.tokens
  for update to authenticated
  using (public.can_edit_map(map_id) or owner_id = auth.uid())
  with check (public.can_edit_map(map_id) or owner_id = auth.uid());
create policy "tokens: mestre apaga" on public.tokens
  for delete to authenticated using (public.can_edit_map(map_id));

-- O jogador dono só pode mexer em posição, vida e notas do próprio token.
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
     or new.scale is distinct from old.scale
     or new.hp_max is distinct from old.hp_max
     or new.hidden is distinct from old.hidden then
    raise exception 'Jogador só pode mover o token e alterar vida e notas.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger tokens_guard before update on public.tokens
  for each row execute function public.guard_token_update();

-- Névoa
create policy "névoa: quem vê o mapa vê a névoa" on public.map_fog
  for select to authenticated using (public.can_view_map(map_id));
create policy "névoa: mestre cria" on public.map_fog
  for insert to authenticated with check (public.can_edit_map(map_id));
create policy "névoa: mestre edita" on public.map_fog
  for update to authenticated
  using (public.can_edit_map(map_id)) with check (public.can_edit_map(map_id));
create policy "névoa: mestre apaga" on public.map_fog
  for delete to authenticated using (public.can_edit_map(map_id));

-- Anotações
create policy "anotações: mestre e destinatários veem" on public.notes
  for select to authenticated using (public.can_read_note(id));
create policy "anotações: mestre envia" on public.notes
  for insert to authenticated
  with check (public.is_room_gm(room_id) and author_id = auth.uid());
create policy "anotações: mestre edita" on public.notes
  for update to authenticated
  using (public.is_room_gm(room_id)) with check (public.is_room_gm(room_id));
create policy "anotações: mestre apaga" on public.notes
  for delete to authenticated using (public.is_room_gm(room_id));

create policy "destinatários: mestre e o próprio veem" on public.note_recipients
  for select to authenticated
  using (user_id = auth.uid() or public.is_room_gm(public.note_room_id(note_id)));
create policy "destinatários: mestre escolhe membros" on public.note_recipients
  for insert to authenticated
  with check (
    public.is_room_gm(public.note_room_id(note_id))
    and exists (select 1 from public.room_members m
                where m.room_id = public.note_room_id(note_id) and m.user_id = note_recipients.user_id)
  );
create policy "destinatários: mestre remove" on public.note_recipients
  for delete to authenticated using (public.is_room_gm(public.note_room_id(note_id)));

-- Rolagens
create policy "rolagens: membros veem as públicas" on public.dice_rolls
  for select to authenticated
  using (
    public.is_room_member(room_id)
    and (not hidden or roller_id = auth.uid() or public.is_room_gm(room_id))
  );
create policy "rolagens: membros rolam, só o mestre esconde" on public.dice_rolls
  for insert to authenticated
  with check (
    public.is_room_member(room_id) and roller_id = auth.uid()
    and (not hidden or public.is_room_gm(room_id))
  );
create policy "rolagens: mestre limpa o histórico" on public.dice_rolls
  for delete to authenticated using (public.is_room_gm(room_id));

-- Iniciativa
create policy "iniciativa: membros veem" on public.initiative_entries
  for select to authenticated using (public.is_room_member(room_id));
create policy "iniciativa: mestre cria" on public.initiative_entries
  for insert to authenticated with check (public.is_room_gm(room_id));
create policy "iniciativa: mestre edita" on public.initiative_entries
  for update to authenticated
  using (public.is_room_gm(room_id)) with check (public.is_room_gm(room_id));
create policy "iniciativa: mestre apaga" on public.initiative_entries
  for delete to authenticated using (public.is_room_gm(room_id));

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app (transação única: tudo ou nada) [#89]
-- ---------------------------------------------------------------------------
create or replace function public.create_room(p_name text, p_nickname text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_room public.rooms;
begin
  if not public.is_registered() then
    raise exception 'Só quem tem conta pode criar uma mesa.' using errcode = '42501';
  end if;
  insert into public.rooms (name, owner_id) values (trim(p_name), auth.uid())
  returning * into new_room;
  insert into public.room_members (room_id, user_id, role, nickname)
  values (new_room.id, auth.uid(), 'gm', left(trim(p_nickname), 40));
  return new_room;
end;
$$;

create or replace function public.join_room(p_slug text, p_nickname text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'Faça login (ou entre como convidado) antes de entrar na mesa.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_nickname, ''))) = 0 then
    raise exception 'Escolha um apelido.' using errcode = '22023';
  end if;
  select r.id into target from public.rooms r where r.slug = lower(trim(p_slug));
  if target is null then
    raise exception 'Mesa não encontrada.' using errcode = 'P0002';
  end if;
  insert into public.room_members (room_id, user_id, role, nickname)
  values (target, auth.uid(), 'player', left(trim(p_nickname), 40))
  on conflict (room_id, user_id) do nothing;
  return target;
end;
$$;

-- Prévia do convite: mostra só o nome da mesa antes de entrar.
create or replace function public.get_room_preview(p_slug text)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.name from public.rooms r where r.slug = lower(trim(p_slug));
$$;

revoke execute on function public.create_room(text, text) from public, anon;
revoke execute on function public.join_room(text, text) from public, anon;
revoke execute on function public.get_room_preview(text) from public, anon;
grant execute on function public.create_room(text, text) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;
grant execute on function public.get_room_preview(text) to authenticated;
