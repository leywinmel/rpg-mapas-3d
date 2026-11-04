-- Testes da ordem de iniciativa (RPG-21). Rodar: npm run test:db
-- O jogador vê só as entradas à vista (token escondido ou sob a névoa não vaza o nome), muda só o
-- valor da própria entrada, e só o mestre passa a vez e limpa a ordem.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- Usuários: mestre, jogadora Ana (conta), convidada Bia (anônima) e um estranho fora da mesa
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mestre@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@teste.local', '{"display_name":"Ana"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '{}', true, now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'estranho@teste.local', '{}', false, now(), now());

create or replace function pg_temp.act_as(p_user uuid, p_anon boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end;
$$;

-- O mestre cria a mesa e um mapa v2 de 40×40 (2×2 pedaços)
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa do combate', 'Mestre') r;
grant select on ctx to authenticated;
insert into public.maps (id, owner_id, room_id, name, width, depth, schema_version, document)
values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', (select room_id from ctx),
        'Arena', 40, 40, 2, '{"version": 2, "ambience": {"preset": "masmorra", "fogColor": "#0d0b14", "light": 0.6}}');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
do $$ begin perform public.join_room((select slug from ctx), 'Ana'); end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
do $$ begin perform public.join_room((select slug from ctx), 'Bia'); end $$;

-- Tokens: o da Ana, um esqueleto à vista, uma emboscada escondida e uma sombra sob a névoa
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.tokens (id, map_id, owner_id, kind, name, model_key, x, z, hidden) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a2', 'model', 'Ana', 'figure', 5, 5, false),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000b001', null, 'model', 'Esqueleto', 'creature', 5, 20, false),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-00000000b001', null, 'model', 'Emboscada', 'creature', 1, 1, true),
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-00000000b001', null, 'model', 'Sombra', 'creature', 35, 5, false);
-- Névoa ligada, tudo à vista menos o pedaço (1, 0), onde está a sombra
select public.save_map_fog('00000000-0000-0000-0000-00000000b001', true, false,
  jsonb_build_array(jsonb_build_object('cx', 1, 'cz', 0, 'covered', repeat('1', 1024))));

-- ---------------------------------------------------------------------------
-- Quem monta a ordem
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$ insert into public.initiative_entries (room_id, label, value)
  values ((select room_id from ctx), 'Eu primeiro', 30) $$,
  '42501', null, 'jogadora não cria entrada');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ insert into public.initiative_entries (id, room_id, token_id, label, value, hidden) values
  ('00000000-0000-0000-0000-0000000000e1', (select room_id from ctx), '00000000-0000-0000-0000-0000000000c1', 'Ana', 15, false),
  ('00000000-0000-0000-0000-0000000000e2', (select room_id from ctx), '00000000-0000-0000-0000-0000000000c2', 'Esqueleto', 12, false),
  ('00000000-0000-0000-0000-0000000000e3', (select room_id from ctx), '00000000-0000-0000-0000-0000000000c4', 'Emboscada', 20, false),
  ('00000000-0000-0000-0000-0000000000e4', (select room_id from ctx), '00000000-0000-0000-0000-0000000000c6', 'Sombra', 8, false),
  ('00000000-0000-0000-0000-0000000000e5', (select room_id from ctx), null, 'Reforços', 5, true),
  ('00000000-0000-0000-0000-0000000000e6', (select room_id from ctx), null, 'Armadilha', 3, false) $$,
  'mestre põe tokens e entradas livres na ordem');
select throws_ok($$ insert into public.initiative_entries (room_id, token_id, label)
  values ((select room_id from ctx), '00000000-0000-0000-0000-0000000000c1', 'Ana de novo') $$,
  '23505', null, 'o mesmo token não entra duas vezes');
select throws_ok($$ insert into public.initiative_entries (room_id, token_id, label)
  values ((select room_id from ctx), '00000000-0000-0000-0000-0000000000ff', 'Fantasma') $$,
  '22023', null, 'token que não é de um mapa da mesa é recusado');
select throws_ok($$ insert into public.initiative_entries (room_id, label, value)
  values ((select room_id from ctx), 'Exagero', 5000) $$,
  '23514', null, 'valor fora da faixa é recusado');

-- ---------------------------------------------------------------------------
-- Quem vê o quê: nada escondido ou sob a névoa chega ao jogador
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.initiative_entries), 6, 'mestre vê a ordem inteira');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select results_eq($$ select label from public.initiative_entries order by label $$,
  array['Ana', 'Armadilha', 'Esqueleto'],
  'jogadora não vê a emboscada (token escondido), a sombra (sob a névoa) nem os reforços (entrada escondida)');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
select is((select count(*)::int from public.initiative_entries), 3, 'convidada vê o mesmo que a jogadora');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.initiative_entries), 0, 'quem não é da mesa não vê nada');

-- ---------------------------------------------------------------------------
-- Jogador muda só o valor da própria entrada
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok($$ update public.initiative_entries set value = 17 where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'jogadora muda o valor da própria entrada');
select is((select value from public.initiative_entries where id = '00000000-0000-0000-0000-0000000000e1'), 17,
  'o valor gravou');
select throws_ok($$ update public.initiative_entries set label = 'Ana, a rápida' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '42501', null, 'jogadora não muda o nome da própria entrada');
select throws_ok($$ update public.initiative_entries set is_current = true where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '42501', null, 'jogadora não toma a vez');
update public.initiative_entries set value = 1 where id = '00000000-0000-0000-0000-0000000000e2';
delete from public.initiative_entries where id = '00000000-0000-0000-0000-0000000000e6';
select throws_ok($$ select public.set_initiative_turn((select room_id from ctx), 1, '00000000-0000-0000-0000-0000000000e1') $$,
  '42501', null, 'jogadora não passa a vez');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
update public.initiative_entries set value = 2 where id = '00000000-0000-0000-0000-0000000000e1';

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select value from public.initiative_entries where id = '00000000-0000-0000-0000-0000000000e2'), 12,
  'jogadora não muda o valor da entrada dos outros');
select is((select value from public.initiative_entries where id = '00000000-0000-0000-0000-0000000000e1'), 17,
  'convidada não muda o valor da entrada da Ana');
select is((select count(*)::int from public.initiative_entries), 6, 'jogadora não apaga entrada');

-- ---------------------------------------------------------------------------
-- Vez e rodada
-- ---------------------------------------------------------------------------
select lives_ok($$ select public.set_initiative_turn((select room_id from ctx), 1, '00000000-0000-0000-0000-0000000000e3') $$,
  'mestre começa o combate');
select lives_ok($$ select public.set_initiative_turn((select room_id from ctx), 2, '00000000-0000-0000-0000-0000000000e1') $$,
  'mestre passa a vez');
select results_eq($$ select id from public.initiative_entries where is_current $$,
  array['00000000-0000-0000-0000-0000000000e1'::uuid], 'só uma entrada tem a vez');
select throws_ok($$ select public.set_initiative_turn((select room_id from ctx), 2, '00000000-0000-0000-0000-0000000000ff') $$,
  '22023', null, 'a vez só vai para uma entrada desta mesa');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select initiative_round from public.rooms where id = (select room_id from ctx)), 2,
  'a jogadora vê a rodada');

-- ---------------------------------------------------------------------------
-- A ordem acompanha o token
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
update public.tokens set hidden = false where id = '00000000-0000-0000-0000-0000000000c4';
delete from public.tokens where id = '00000000-0000-0000-0000-0000000000c2';
select is((select count(*)::int from public.initiative_entries), 5, 'token apagado sai da ordem');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select results_eq($$ select label from public.initiative_entries order by label $$,
  array['Ana', 'Armadilha', 'Emboscada'], 'a emboscada revelada aparece para a jogadora');

-- ---------------------------------------------------------------------------
-- Fim do combate
-- ---------------------------------------------------------------------------
select throws_ok($$ select public.clear_initiative((select room_id from ctx)) $$,
  '42501', null, 'jogadora não limpa a ordem');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.clear_initiative((select room_id from ctx)) $$, 'mestre limpa a ordem');
select is((select count(*)::int from public.initiative_entries), 0, 'a ordem ficou vazia');
select is((select initiative_round from public.rooms where id = (select room_id from ctx)), 0,
  'a rodada voltou a zero');

select * from finish();
rollback;
