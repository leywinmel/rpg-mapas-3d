-- Testes da trava do corte de andares (rooms.cutaway_lock). Rodar: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mestre-corte@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jogador-corte@teste.local', '{"display_name":"Jogador"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'intruso-corte@teste.local', '{"display_name":"Intruso"}', false, now(), now());

create or replace function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', false)::text, true);
end;
$$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
create temp table ctx as select r.id as room_id, r.slug, r.cutaway_lock from public.create_room('Mesa do corte', 'Mestre') r;
grant select on ctx to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select public.join_room((select slug from ctx), 'Jogador');

select is((select cutaway_lock from ctx), null::integer, 'mesa nova nasce livre');

-- Mestre trava e o jogador lê a trava
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
update public.rooms set cutaway_lock = 4 where id = (select room_id from ctx);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select is((select cutaway_lock from public.rooms where id = (select room_id from ctx)), 4,
  'jogador vê a trava do mestre');

-- Jogador não destrava (o RLS não deixa a linha mudar)
update public.rooms set cutaway_lock = null where id = (select room_id from ctx);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select is((select cutaway_lock from public.rooms where id = (select room_id from ctx)), 4,
  'jogador não mexe na trava');

-- Quem não é da mesa nem enxerga a mesa
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d3');
update public.rooms set cutaway_lock = 8 where id = (select room_id from ctx);
select is((select count(*)::int from public.rooms where id = (select room_id from ctx)), 0,
  'quem é de fora não vê a mesa');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select is((select cutaway_lock from public.rooms where id = (select room_id from ctx)), 4,
  'quem é de fora não mexe na trava');

-- Valor fora do intervalo é recusado; o mestre libera a mesa
select throws_ok($$ update public.rooms set cutaway_lock = 272 where id = (select room_id from ctx) $$,
  '23514', null, 'trava acima do maior corte é recusada');
update public.rooms set cutaway_lock = null where id = (select room_id from ctx);
select is((select cutaway_lock from public.rooms where id = (select room_id from ctx)), null::integer,
  'mestre libera a mesa');

select * from finish();
rollback;
