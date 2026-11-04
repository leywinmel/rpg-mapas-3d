-- RPG-21 (F9): ordem de iniciativa da mesa.
--
-- 1) A entrada pode ser escondida dos jogadores (o monstro da emboscada entra na ordem antes de
--    aparecer). Entrada de token segue o token: o jogador só vê a entrada se vê o token (o RLS dos
--    tokens, da F6, já tira o escondido e o que está todo sob a névoa). Assim o nome nunca vaza
--    pela iniciativa.
-- 2) O jogador muda só o valor da entrada do próprio token; o resto é do mestre.
-- 3) A rodada mora na mesa (rooms.initiative_round): 0 = combate parado.
-- 4) Passar a vez e limpar a ordem são uma transação cada [#89].

-- ---------------------------------------------------------------------------
-- 1. Colunas e integridade
-- ---------------------------------------------------------------------------
-- Token apagado sai da ordem junto: com "set null" a entrada ficaria solta com o nome de um
-- token que pode ter sido escondido.
alter table public.initiative_entries
  drop constraint initiative_entries_token_id_fkey,
  add constraint initiative_entries_token_id_fkey
    foreign key (token_id) references public.tokens (id) on delete cascade,
  add column hidden boolean not null default false,
  -- Iniciativa de RPG cabe com folga aqui (d20 + modificador, ou o valor que o mestre quiser).
  add constraint initiative_value_range check (value between -99 and 999),
  add constraint initiative_position_range check (position between 0 and 10000);

-- Um token entra uma vez só, e só uma entrada tem a vez.
create unique index initiative_token_once on public.initiative_entries (room_id, token_id)
  where token_id is not null;
create unique index initiative_one_current on public.initiative_entries (room_id)
  where is_current;

alter table public.rooms
  add column initiative_round integer not null default 0
    constraint rooms_initiative_round_range check (initiative_round between 0 and 100000);
-- Só o mestre troca: a política "mesas: mestre edita" já barra quem não é mestre.
grant update (initiative_round) on public.rooms to authenticated;

-- O token da entrada precisa ser de um mapa desta mesa (integridade, vale para o mestre também).
create or replace function public.check_initiative_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.token_id is not null and not exists (
    select 1 from public.tokens t
    join public.maps mp on mp.id = t.map_id
    where t.id = new.token_id and mp.room_id = new.room_id
  ) then
    raise exception 'O token precisa ser de um mapa desta mesa.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger initiative_entries_check before insert or update on public.initiative_entries
  for each row execute function public.check_initiative_entry();

-- A entrada é do jogador quando o token dela é dele. Sem security definer: roda com o RLS dos
-- tokens de quem pergunta (o dono sempre vê o próprio token).
create or replace function public.owns_initiative_token(p_token uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_token is not null and exists (
    select 1 from public.tokens t where t.id = p_token and t.owner_id = auth.uid()
  );
$$;

-- O jogador dono só muda o valor; nome, ordem, vez, token e "escondida" são do mestre.
create or replace function public.guard_initiative_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_room_gm(old.room_id) then
    return new;
  end if;
  if new.room_id is distinct from old.room_id
     or new.token_id is distinct from old.token_id
     or new.label is distinct from old.label
     or new.position is distinct from old.position
     or new.is_current is distinct from old.is_current
     or new.hidden is distinct from old.hidden then
    raise exception 'Jogador só pode mudar o valor da própria iniciativa.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger initiative_entries_guard before update on public.initiative_entries
  for each row execute function public.guard_initiative_update();

-- ---------------------------------------------------------------------------
-- 2. Quem vê e quem muda
-- ---------------------------------------------------------------------------
-- O exists em tokens roda com o RLS de quem lê: token escondido ou sob a névoa não aparece, e a
-- entrada dele também não.
drop policy "iniciativa: membros veem" on public.initiative_entries;
create policy "iniciativa: mestre vê tudo, jogador o que está à vista" on public.initiative_entries
  for select to authenticated
  using (
    public.is_room_gm(room_id)
    or (public.is_room_member(room_id)
        and not hidden
        and (token_id is null
             or exists (select 1 from public.tokens t where t.id = initiative_entries.token_id)))
  );

drop policy "iniciativa: mestre edita" on public.initiative_entries;
create policy "iniciativa: mestre edita, jogador o valor da própria" on public.initiative_entries
  for update to authenticated
  using (
    public.is_room_gm(room_id)
    or (public.is_room_member(room_id) and not hidden and public.owns_initiative_token(token_id))
  )
  with check (
    public.is_room_gm(room_id)
    or (public.is_room_member(room_id) and not hidden and public.owns_initiative_token(token_id))
  );

-- ---------------------------------------------------------------------------
-- 3. Vez e rodada
-- ---------------------------------------------------------------------------
-- Põe a vez em p_current (nula = ninguém) e grava a rodada. A conta de quem vem depois é do
-- domínio (src/domain/initiative.ts); aqui é só a gravação, inteira ou nada.
-- "security invoker": as políticas acima valem para cada instrução.
create or replace function public.set_initiative_turn(
  p_room_id uuid,
  p_round   integer,
  p_current uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_room_gm(p_room_id) then
    raise exception 'Só o mestre da mesa passa a vez.' using errcode = '42501';
  end if;
  if p_current is not null and not exists (
    select 1 from public.initiative_entries e where e.id = p_current and e.room_id = p_room_id
  ) then
    raise exception 'Essa entrada não é da ordem desta mesa.' using errcode = '22023';
  end if;
  -- Primeiro tira a vez de quem tinha: o índice de "uma vez só" confere linha a linha.
  update public.initiative_entries e set is_current = false
   where e.room_id = p_room_id and e.is_current and e.id is distinct from p_current;
  update public.initiative_entries e set is_current = true
   where e.id = p_current and not e.is_current;
  update public.rooms r set initiative_round = p_round where r.id = p_room_id;
end;
$$;

-- Fim do combate: a ordem fica vazia e a rodada volta a zero.
create or replace function public.clear_initiative(p_room_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_room_gm(p_room_id) then
    raise exception 'Só o mestre da mesa limpa a ordem.' using errcode = '42501';
  end if;
  delete from public.initiative_entries e where e.room_id = p_room_id;
  update public.rooms r set initiative_round = 0 where r.id = p_room_id;
end;
$$;

revoke execute on function public.owns_initiative_token(uuid) from public, anon;
revoke execute on function public.set_initiative_turn(uuid, integer, uuid) from public, anon;
revoke execute on function public.clear_initiative(uuid) from public, anon;
grant execute on function public.owns_initiative_token(uuid) to authenticated;
grant execute on function public.set_initiative_turn(uuid, integer, uuid) to authenticated;
grant execute on function public.clear_initiative(uuid) to authenticated;
