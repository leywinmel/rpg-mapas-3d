-- Admin do site: entra em qualquer mesa como mestre e vê e mexe em tudo dela (mapas, tokens,
-- névoa, anotações, modelos enviados). Pedido do usuário em 11/11.
-- Quem é admin NÃO fica no Git (é dado pessoal): a linha entra direto no banco de cada
-- ambiente, por SQL de quem administra o projeto. O app não tem como se promover a admin.

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Cada um só descobre se ele mesmo é admin; ninguém grava pelo app (sem política de escrita).
create policy "admins: ver a si mesmo" on public.admins
  for select to authenticated using (user_id = auth.uid());

revoke insert, update, delete on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- As regras de acesso das mesas passam por estas duas funções: o admin conta como membro e
-- mestre de todas, sem repetir a exceção em cada política.
create or replace function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
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
  select public.is_admin() or exists (
    select 1 from public.room_members m
    where m.room_id = p_room and m.user_id = auth.uid() and m.role = 'gm'
  );
$$;

-- O admin entra como mestre (a tela mostra as ferramentas do mestre); se já era jogador da
-- mesa, sobe para mestre. Os outros seguem entrando como jogador.
create or replace function public.join_room(p_slug text, p_nickname text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  joined_role text := case when public.is_admin() then 'gm' else 'player' end;
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
  values (target, auth.uid(), joined_role, left(trim(p_nickname), 40))
  on conflict (room_id, user_id) do update set role = 'gm'
    where joined_role = 'gm';
  return target;
end;
$$;

-- O admin vê os modelos .glb de todos os mestres.
drop policy "modelos: dono e jogadores do mestre veem" on public.map_assets;
create policy "modelos: dono, jogadores do mestre e admin veem" on public.map_assets
  for select to authenticated
  using (
    owner_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.room_members gm
      join public.room_members me on me.room_id = gm.room_id
      where gm.user_id = map_assets.owner_id and gm.role = 'gm' and me.user_id = auth.uid()
    )
  );
