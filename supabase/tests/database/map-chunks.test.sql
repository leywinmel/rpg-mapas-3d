-- Testes dos pedaços do mapa v2 (map_chunks) e da gravação atômica (save_map_v2).
-- Rodar: npm run test:db
-- Cada teste "vira" um usuário trocando o JWT da sessão e confere o que ele enxerga e grava.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

-- Usuários: mestre, jogadora Ana (conta), convidada Bia (anônima) e um estranho, mestre de outra mesa
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

-- Documento mínimo de um pedaço e cabeçalho v2 (o app confere o resto ao ler).
create or replace function pg_temp.chunk(p_mark text) returns jsonb
language sql as $$ select jsonb_build_object('version', 2, 'mark', p_mark) $$;
create or replace function pg_temp.header() returns jsonb
language sql as $$ select '{"version": 2, "ambience": {"preset": "masmorra", "fogColor": "#0d0b14", "light": 0.6}}'::jsonb $$;

-- O mestre cria a mesa, um mapa v2 de 70×40 (3×2 pedaços) e um mapa ainda no v1
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa dos pedaços', 'Mestre') r;
grant select on ctx to authenticated, anon;
insert into public.maps (id, owner_id, room_id, name, width, depth, schema_version, document)
values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', (select room_id from ctx),
   'Vila', 70, 40, 2, pg_temp.header()),
  ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000a1', (select room_id from ctx),
   'Masmorra antiga', 20, 20, 1, '{"version": 1}');

-- Ana e Bia entram pelo link
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
do $$ begin perform public.join_room((select slug from ctx), 'Ana'); end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
do $$ begin perform public.join_room((select slug from ctx), 'Bia'); end $$;

-- O estranho tem a própria mesa, com um mapa e um pedaço
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
create temp table other_room as select r.id as room_id from public.create_room('Outra mesa', 'Estranho') r;
grant select on other_room to authenticated;
insert into public.maps (id, owner_id, room_id, name, width, depth, schema_version, document)
values ('00000000-0000-0000-0000-00000000b003', '00000000-0000-0000-0000-0000000000a4',
        (select room_id from other_room), 'Mapa do estranho', 40, 40, 2, pg_temp.header());
insert into public.map_chunks (map_id, cx, cz, document)
values ('00000000-0000-0000-0000-00000000b003', 0, 0, pg_temp.chunk('do estranho'));

-- ---------------------------------------------------------------------------
-- Mestre: grava, troca e apaga pedaços
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ insert into public.map_chunks (map_id, cx, cz, document)
  values ('00000000-0000-0000-0000-00000000b001', 2, 1, pg_temp.chunk('direto')) $$,
  'mestre grava um pedaço direto na tabela');
select isnt((select public.save_map_v2('00000000-0000-0000-0000-00000000b001', pg_temp.header(),
    '[{"cx": 0, "cz": 0, "document": {"version": 2, "mark": "a"}},
      {"cx": 1, "cz": 0, "document": {"version": 2, "mark": "b"}}]'::jsonb,
    '[{"cx": 2, "cz": 1}]'::jsonb)), null::timestamptz,
  'save_map_v2 grava e devolve a hora da gravação');
select results_eq(
  $$ select cx, cz from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001' order by cz, cx $$,
  $$ values (0, 0), (1, 0) $$,
  'a gravação insere os pedaços novos e apaga o que voltou ao chão liso');
select lives_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000b001', pg_temp.header(),
    '[{"cx": 0, "cz": 0, "document": {"version": 2, "mark": "a2"}}]'::jsonb) $$,
  'save_map_v2 sem lista de apagar usa a lista vazia');
select is((select document ->> 'mark' from public.map_chunks
  where map_id = '00000000-0000-0000-0000-00000000b001' and cx = 0 and cz = 0), 'a2',
  'gravar um pedaço que já existe troca o documento dele');
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000b001', pg_temp.header(),
    '[{"cx": 3, "cz": 0, "document": {"version": 2}}]'::jsonb) $$,
  '22023', null, 'pedaço fora do tamanho deste mapa é recusado');
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000b001', '{"version": 1}'::jsonb) $$,
  '22023', null, 'cabeçalho que não é da versão 2 é recusado');
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000b001', pg_temp.header(),
    '[{"cx": 1, "cz": 1, "document": {"version": 2}}, {"cx": 1, "cz": 1, "document": {"version": 2}}]'::jsonb) $$,
  '21000', null, 'o mesmo pedaço duas vezes na mesma gravação é recusado');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 2,
  'gravação recusada não deixa nada pela metade');
select throws_ok($$ insert into public.map_chunks (map_id, cx, cz, document)
  values ('00000000-0000-0000-0000-00000000b001', 32, 0, pg_temp.chunk('x')) $$,
  '23514', null, 'pedaço além do 31 não existe nem no maior mapa');
select throws_ok($$ insert into public.map_chunks (map_id, cx, cz, document)
  select '00000000-0000-0000-0000-00000000b001', 1, 1,
         jsonb_build_object('version', 2, 'lixo', string_agg(md5(i::text), ''))
  from generate_series(1, 50000) i $$,
  '23514', null, 'documento de pedaço acima de 1,5 MB é recusado');
select throws_ok($$ update public.map_chunks set cx = 2
  where map_id = '00000000-0000-0000-0000-00000000b001' and cx = 0 and cz = 0 $$,
  '42501', null, 'nem o mestre move um pedaço de lugar trocando cx ou cz');
select lives_ok($$ delete from public.map_chunks
  where map_id = '00000000-0000-0000-0000-00000000b001' and cx = 1 and cz = 0 $$,
  'mestre apaga um pedaço direto na tabela');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 1,
  'o pedaço apagado sai');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b003'), 0,
  'o mestre não vê os pedaços do mapa de outra mesa');
-- Devolve o pedaço (1, 0) para os testes de leitura dos outros papéis.
do $$ begin
  perform public.save_map_v2('00000000-0000-0000-0000-00000000b001', pg_temp.header(),
    '[{"cx": 1, "cz": 0, "document": {"version": 2, "mark": "b"}}]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Mapa ainda no v1: a primeira gravação passa para o v2 com só os pedaços dela
-- ---------------------------------------------------------------------------
insert into public.map_chunks (map_id, cx, cz, document)
values ('00000000-0000-0000-0000-00000000b002', 0, 0, pg_temp.chunk('sobra'));
select lives_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000b002', pg_temp.header(),
    '[{"cx": 0, "cz": 0, "document": {"version": 2, "mark": "convertido"}}]'::jsonb) $$,
  'mestre grava pela primeira vez um mapa do v1');
select results_eq(
  $$ select schema_version, document -> 'version' from public.maps where id = '00000000-0000-0000-0000-00000000b002' $$,
  $$ values (2, '2'::jsonb) $$,
  'o mapa passa para o v2 com o cabeçalho novo');
select results_eq(
  $$ select document ->> 'mark' from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b002' $$,
  $$ values ('convertido') $$,
  'os pedaços que sobravam do v1 saem e ficam só os da gravação');

-- ---------------------------------------------------------------------------
-- Tamanho e versão do mapa
-- ---------------------------------------------------------------------------
select lives_ok($$ update public.maps set width = 1000, depth = 1000
  where id = '00000000-0000-0000-0000-00000000b001' $$, 'mapa v2 chega a 1000×1000');
select throws_ok($$ update public.maps set width = 1001
  where id = '00000000-0000-0000-0000-00000000b001' $$, '23514', null, 'nenhum mapa passa de 1000 casas');
select throws_ok($$ insert into public.maps (owner_id, room_id, name, width, depth)
  values ('00000000-0000-0000-0000-0000000000a1', (select room_id from ctx), 'v1 grande', 200, 10) $$,
  '23514', null, 'mapa do v1 continua limitado a 100×100');
select throws_ok($$ update public.maps set document = '{"version": 1}'
  where id = '00000000-0000-0000-0000-00000000b001' $$,
  '23514', null, 'documento v1 não grava por cima de um mapa já no v2');

-- ---------------------------------------------------------------------------
-- Jogadora com conta: lê, mas não grava nem apaga
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 2,
  'jogadora lê os pedaços do mapa da mesa');
select throws_ok($$ insert into public.map_chunks (map_id, cx, cz, document)
  values ('00000000-0000-0000-0000-00000000b001', 1, 1, pg_temp.chunk('ana')) $$,
  '42501', null, 'jogadora não grava pedaço');
update public.map_chunks set document = pg_temp.chunk('ana')
  where map_id = '00000000-0000-0000-0000-00000000b001';
delete from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001';
select results_eq(
  $$ select document ->> 'mark' from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001' order by cx $$,
  $$ values ('a2'), ('b') $$,
  'troca e apagar da jogadora não mexem em nada');
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000b001', pg_temp.header()) $$,
  '42501', null, 'jogadora não chama save_map_v2');

-- ---------------------------------------------------------------------------
-- Convidada (anônima): lê, mas não grava
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 2,
  'convidada lê os pedaços do mapa da mesa');
select throws_ok($$ insert into public.map_chunks (map_id, cx, cz, document)
  values ('00000000-0000-0000-0000-00000000b001', 1, 1, pg_temp.chunk('bia')) $$,
  '42501', null, 'convidada não grava pedaço');
delete from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001';
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000b001', pg_temp.header()) $$,
  '42501', null, 'convidada não chama save_map_v2');

-- ---------------------------------------------------------------------------
-- Estranho (mestre de outra mesa): não vê nem mexe
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 0,
  'estranho não vê os pedaços de um mapa de outra mesa');
select is((select count(*)::int from public.map_chunks), 1,
  'estranho só vê os pedaços do próprio mapa');
select throws_ok($$ insert into public.map_chunks (map_id, cx, cz, document)
  values ('00000000-0000-0000-0000-00000000b001', 1, 1, pg_temp.chunk('estranho')) $$,
  '42501', null, 'estranho não grava pedaço no mapa dos outros');
update public.map_chunks set document = pg_temp.chunk('estranho')
  where map_id = '00000000-0000-0000-0000-00000000b001';
delete from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001';
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000b001', pg_temp.header()) $$,
  '42501', null, 'estranho não chama save_map_v2 no mapa dos outros');
select throws_ok($$ select public.save_map_v2(gen_random_uuid(), pg_temp.header()) $$,
  '42501', null, 'mapa que não existe dá a mesma resposta (não revela o que existe)');

-- De volta ao mestre: nada do que eles tentaram mudou o mapa
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select results_eq(
  $$ select document ->> 'mark' from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001' order by cx $$,
  $$ values ('a2'), ('b') $$,
  'troca e apagar da convidada e do estranho não mexem em nada');

-- ---------------------------------------------------------------------------
-- Sem login (anon): nenhum acesso
-- ---------------------------------------------------------------------------
select set_config('role', 'anon', true);
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok($$ select count(*) from public.map_chunks $$, '42501', null, 'sem login não lê pedaço');
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000b001', '{}'::jsonb) $$,
  '42501', null, 'sem login não chama save_map_v2');

-- ---------------------------------------------------------------------------
-- Apagar o mapa leva os pedaços junto
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ delete from public.maps where id = '00000000-0000-0000-0000-00000000b001' $$,
  'mestre apaga o mapa');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 0,
  'os pedaços do mapa apagado somem junto');
reset role;
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 0,
  'nem o banco guarda pedaço órfão');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b003'), 1,
  'o mapa do estranho segue intacto');

select * from finish();
rollback;
