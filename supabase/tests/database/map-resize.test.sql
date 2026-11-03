-- Testes de mudar o tamanho de um mapa v2 pelo save_map_v2 (p_width e p_depth).
-- Rodar: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mestre-tamanho@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jogador-tamanho@teste.local', '{"display_name":"Jogador"}', false, now(), now());

create or replace function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', false)::text, true);
end;
$$;

create or replace function pg_temp.header() returns jsonb
language sql as $$ select '{"version": 2, "ambience": {"preset": "masmorra", "fogColor": "#0d0b14", "light": 0.6}}'::jsonb $$;

-- Mapa v2 de 70×40 (3×2 pedaços) com os seis pedaços gravados
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa do tamanho', 'Mestre') r;
grant select on ctx to authenticated;
insert into public.maps (id, owner_id, room_id, name, width, depth, schema_version, document)
values ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000c1',
        (select room_id from ctx), 'Vila', 70, 40, 2, pg_temp.header());
insert into public.map_chunks (map_id, cx, cz, document)
select '00000000-0000-0000-0000-00000000c001', cx, cz, '{"version": 2}'::jsonb
  from generate_series(0, 2) cx, generate_series(0, 1) cz;

-- Diminuir: as linhas de fora saem, o tamanho muda e o pedaço da nova borda pode ser regravado
select lives_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000c001', pg_temp.header(),
    '[{"cx": 1, "cz": 0, "document": {"version": 2, "mark": "borda"}}]'::jsonb, '[]'::jsonb, 50, 30) $$,
  'mestre diminui o mapa na mesma gravação dos pedaços');
select results_eq(
  $$ select width, depth from public.maps where id = '00000000-0000-0000-0000-00000000c001' $$,
  $$ values (50, 30) $$,
  'o mapa fica com o tamanho novo');
select results_eq(
  $$ select cx, cz, document ->> 'mark' from public.map_chunks
      where map_id = '00000000-0000-0000-0000-00000000c001' order by cz, cx $$,
  $$ values (0, 0, null::text), (1, 0, 'borda') $$,
  'os pedaços que saíram do mapa são apagados');

-- Pedaço conferido contra o tamanho novo, não o antigo
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000c001', pg_temp.header(),
    '[{"cx": 1, "cz": 0, "document": {"version": 2}}]'::jsonb, '[]'::jsonb, 32, 30) $$,
  '22023', null, 'pedaço fora do tamanho novo é recusado');
select results_eq(
  $$ select width from public.maps where id = '00000000-0000-0000-0000-00000000c001' $$,
  $$ values (50) $$,
  'a gravação recusada não muda o tamanho');

-- Crescer até o limite e passar dele
select lives_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000c001', pg_temp.header(),
    '[{"cx": 31, "cz": 31, "document": {"version": 2}}]'::jsonb, '[]'::jsonb, 1000, 1000) $$,
  'mestre cresce o mapa até 1000×1000 com um pedaço no canto');
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000c001', pg_temp.header(),
    '[]'::jsonb, '[]'::jsonb, 1001, 10) $$,
  '22023', null, 'nenhum mapa passa de 1000 casas');
do $$ begin perform public.save_map_v2('00000000-0000-0000-0000-00000000c001', pg_temp.header()); end $$;
select results_eq(
  $$ select width, depth from public.maps where id = '00000000-0000-0000-0000-00000000c001' $$,
  $$ values (1000, 1000) $$,
  'sem tamanho na chamada, o tamanho fica como está');

-- Quem não edita o mapa não muda o tamanho
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
do $$ begin perform public.join_room((select slug from ctx), 'Jogador'); end $$;
select throws_ok($$ select public.save_map_v2('00000000-0000-0000-0000-00000000c001', pg_temp.header(),
    '[]'::jsonb, '[]'::jsonb, 10, 10) $$,
  '42501', null, 'jogador não muda o tamanho do mapa');

select * from finish();
rollback;
