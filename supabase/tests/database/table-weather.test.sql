-- Testes do tempo e da hora da mesa (rooms.weather, rooms.day_phase). Rodar: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mestre-clima@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jogador-clima@teste.local', '{"display_name":"Jogador"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'intruso-clima@teste.local', '{"display_name":"Intruso"}', false, now(), now());

create or replace function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', false)::text, true);
end;
$$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa do clima', 'Mestre') r;
grant select on ctx to authenticated;

-- Criada depois de ctx: função SQL valida o corpo na criação.
create or replace function pg_temp.room_weather() returns text
language sql as $$
  select weather || '/' || day_phase from public.rooms where id = (select room_id from ctx)
$$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select public.join_room((select slug from ctx), 'Jogador');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select is(pg_temp.room_weather(), 'clear/map', 'mesa nova nasce com céu limpo e a luz do mapa');

-- Mestre liga a chuva e a noite; o jogador vê
update public.rooms set weather = 'rain', day_phase = 'night' where id = (select room_id from ctx);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select is(pg_temp.room_weather(), 'rain/night', 'jogador vê a chuva e a noite do mestre');

-- Jogador não desliga a chuva da mesa (o RLS não deixa a linha mudar)
update public.rooms set weather = 'clear', day_phase = 'day' where id = (select room_id from ctx);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select is(pg_temp.room_weather(), 'rain/night', 'jogador não mexe no tempo da mesa');

-- Quem não é da mesa não mexe
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e3');
update public.rooms set weather = 'storm' where id = (select room_id from ctx);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select is(pg_temp.room_weather(), 'rain/night', 'quem é de fora não mexe no tempo');

-- Códigos fora das tabelas de domínio são recusados
select throws_ok($$ update public.rooms set weather = 'neve' where id = (select room_id from ctx) $$,
  '23503', null, 'tempo desconhecido é recusado');
select throws_ok($$ update public.rooms set day_phase = 'madrugada' where id = (select room_id from ctx) $$,
  '23503', null, 'hora desconhecida é recusada');

-- Todos da mesa leem as tabelas de domínio
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select is((select count(*)::int from public.weather_kinds), 3, 'jogador lê os tempos');
select is((select count(*)::int from public.day_phases), 4, 'jogador lê as horas');

select * from finish();
rollback;
