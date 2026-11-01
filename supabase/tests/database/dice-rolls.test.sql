-- Testes de integração das rolagens de dados (RPG-13). Rodar: npm run test:db
-- Cobrem o que a bandeja de dados promete: todos da mesa veem a rolagem pública, a
-- escondida só chega ao mestre, ninguém grava em nome de outro nem edita o que já
-- rolou, só o mestre limpa o histórico e o Realtime entrega as linhas (e só aos membros).
-- Roda numa transação que termina em rollback: não deixa nada no banco compartilhado.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Usuários: mestre, jogador com conta (Ana), jogador convidado anônimo (Bia) e intruso.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dados-mestre@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-00000000d102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dados-ana@teste.local', '{"display_name":"Ana"}', false, now(), now()),
  ('00000000-0000-0000-0000-00000000d103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '{}', true, now(), now()),
  ('00000000-0000-0000-0000-00000000d104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dados-intruso@teste.local', '{"display_name":"Intruso"}', false, now(), now());

-- Assumir a identidade de um usuário
create or replace function pg_temp.act_as(p_user uuid, p_anon boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end;
$$;

-- O mestre cria a mesa; Ana e Bia entram pelo link; o intruso monta a própria mesa.
select pg_temp.act_as('00000000-0000-0000-0000-00000000d101');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa dos dados', 'Mestre') r;
grant select on ctx to authenticated, anon;

select pg_temp.act_as('00000000-0000-0000-0000-00000000d102');
select public.join_room((select slug from ctx), 'Ana');
select pg_temp.act_as('00000000-0000-0000-0000-00000000d103', true);
select public.join_room((select slug from ctx), 'Bia');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d104');
create temp table other_ctx as select r.id as room_id from public.create_room('Outra mesa', 'Intruso') r;
grant select on other_ctx to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Tempo real: a tabela precisa estar na publicação para o postgres_changes entregar
-- ---------------------------------------------------------------------------
select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dice_rolls'
  ),
  'rolagens estão na publicação do Realtime (o histórico ao vivo depende disso)');

-- ---------------------------------------------------------------------------
-- Quem rola
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000d101');
select lives_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, modifier, total, hidden)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d101', '2d20kh1 + 3',
          '[{"sides":20,"value":17},{"sides":20,"value":4}]', 3, 20, false) $$,
  'mestre rola em público');
select lives_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, modifier, total, hidden)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d101', '1d20',
          '[{"sides":20,"value":1}]', 0, 1, true) $$,
  'mestre rola escondido');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d102');
select lives_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, modifier, total)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d102', '1d100',
          '[{"sides":100,"value":100}]', 0, 100) $$,
  'jogadora com conta rola em público');
select throws_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, total, hidden)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d102', '1d6',
          '[{"sides":6,"value":2}]', 2, true) $$,
  '42501', null, 'jogadora não rola escondido');
select throws_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, total)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d101', '1d20',
          '[{"sides":20,"value":20}]', 20) $$,
  '42501', null, 'jogadora não rola em nome do mestre');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d103', true);
select lives_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, total)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d103', '3d6',
          '[{"sides":6,"value":1},{"sides":6,"value":2},{"sides":6,"value":3}]', 6) $$,
  'convidado anônimo rola em público');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d104');
select throws_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, total)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d104', '1d6',
          '[{"sides":6,"value":6}]', 6) $$,
  '42501', null, 'intruso não rola na mesa dos outros');
select lives_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, total)
  values ((select room_id from other_ctx), '00000000-0000-0000-0000-00000000d104', '1d6',
          '[{"sides":6,"value":5}]', 5) $$,
  'intruso rola na própria mesa');

-- ---------------------------------------------------------------------------
-- Quem vê o quê
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000d101');
select is((select count(*)::int from public.dice_rolls where room_id = (select room_id from ctx)), 4,
  'mestre vê todas: as 3 públicas e a escondida dele');
select is((select count(*)::int from public.dice_rolls where hidden), 1, 'mestre enxerga a rolagem escondida');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d102');
select is((select count(*)::int from public.dice_rolls where room_id = (select room_id from ctx)), 3,
  'jogadora vê as públicas de todos, inclusive as dos outros');
select is((select count(*)::int from public.dice_rolls where hidden), 0,
  'jogadora não vê a rolagem escondida do mestre');
select is((select count(*)::int from public.dice_rolls where id is not null and notation = '1d20' and total = 1), 0,
  'o resultado da escondida não vaza nem por filtro');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d103', true);
select is((select count(*)::int from public.dice_rolls where room_id = (select room_id from ctx)), 3,
  'convidado vê as mesmas públicas');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d104');
select is((select count(*)::int from public.dice_rolls where room_id = (select room_id from ctx)), 0,
  'intruso não vê nenhuma rolagem da mesa');
select is((select count(*)::int from public.dice_rolls), 1, 'intruso vê só a rolagem da própria mesa');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d101');
select is((select count(*)::int from public.dice_rolls where room_id = (select room_id from other_ctx)), 0,
  'mestre não vê rolagens de outra mesa');

-- ---------------------------------------------------------------------------
-- Rolagem gravada não se edita nem some por mão alheia
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000d102');
do $$ begin
  update public.dice_rolls set total = 1, results = '[{"sides":100,"value":1}]'
  where roller_id = '00000000-0000-0000-0000-00000000d102';
exception when insufficient_privilege then null;
end $$;
select is((select total from public.dice_rolls where roller_id = '00000000-0000-0000-0000-00000000d102'), 100,
  'quem rolou não consegue trocar o resultado depois');

do $$ begin
  update public.dice_rolls set hidden = true where roller_id = '00000000-0000-0000-0000-00000000d101' and not hidden;
exception when insufficient_privilege then null;
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d103', true);
select is((select count(*)::int from public.dice_rolls where room_id = (select room_id from ctx)), 3,
  'jogador não esconde a rolagem de ninguém');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d102');
do $$ begin
  delete from public.dice_rolls where room_id = (select room_id from ctx);
exception when insufficient_privilege then null;
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d104');
do $$ begin
  delete from public.dice_rolls where room_id = (select room_id from ctx);
exception when insufficient_privilege then null;
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d101');
select is((select count(*)::int from public.dice_rolls where room_id = (select room_id from ctx)), 4,
  'jogador e intruso não limpam o histórico');

-- ---------------------------------------------------------------------------
-- Limites das colunas
-- ---------------------------------------------------------------------------
select throws_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, total)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d101', repeat('1', 101),
          '[{"sides":6,"value":1}]', 1) $$,
  '23514', null, 'notação acima de 100 letras é recusada');
select throws_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, modifier, total)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d101', '1d6+1001',
          '[{"sides":6,"value":1}]', 1001, 1002) $$,
  '23514', null, 'bônus acima de 1000 é recusado');
select throws_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, total)
  values ((select room_id from ctx), '00000000-0000-0000-0000-00000000d101', '1d6', '{"sides":6}', 1) $$,
  '23514', null, 'resultados que não são uma lista são recusados');

-- ---------------------------------------------------------------------------
-- Canal privado dice:<id da mesa>: só membros recebem e enviam
-- ---------------------------------------------------------------------------
select is(public.room_id_from_topic('dice:' || (select room_id from ctx)), (select room_id from ctx),
  'o tópico dice:<id> aponta para a mesa');
select set_config('realtime.topic', 'dice:' || (select room_id from ctx), true);

select pg_temp.act_as('00000000-0000-0000-0000-00000000d102');
select lives_ok($$ insert into realtime.messages (topic, extension, event, payload, private)
  values (realtime.topic(), 'broadcast', 'throw', '{}', true) $$, 'jogadora envia o arremesso no canal dos dados');
select is((select count(*)::int from realtime.messages where topic = realtime.topic()), 1,
  'jogadora recebe do canal dos dados');

select pg_temp.act_as('00000000-0000-0000-0000-00000000d104');
select throws_ok($$ insert into realtime.messages (topic, extension, event, payload, private)
  values (realtime.topic(), 'broadcast', 'throw', '{}', true) $$, '42501', null,
  'intruso não envia no canal dos dados');
select is((select count(*)::int from realtime.messages where topic = realtime.topic()), 0,
  'intruso não recebe nada do canal dos dados');

-- ---------------------------------------------------------------------------
-- Só o mestre limpa o histórico
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000d101');
delete from public.dice_rolls where room_id = (select room_id from ctx);
select is((select count(*)::int from public.dice_rolls where room_id = (select room_id from ctx)), 0,
  'mestre limpa o histórico, inclusive a rolagem escondida');
select pg_temp.act_as('00000000-0000-0000-0000-00000000d102');
select is((select count(*)::int from public.dice_rolls where room_id = (select room_id from ctx)), 0,
  'jogadora vê o histórico vazio depois');
select pg_temp.act_as('00000000-0000-0000-0000-00000000d104');
select is((select count(*)::int from public.dice_rolls), 1,
  'limpar a mesa do mestre não toca nas rolagens de outra mesa');

select * from finish();
rollback;
