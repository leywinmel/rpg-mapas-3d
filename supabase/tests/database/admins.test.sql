-- Testes do admin do site (public.admins). Rodar: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mestre-admin@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jogador-admin@teste.local', '{"display_name":"Jogador"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@teste.local', '{"display_name":"Admin"}', false, now(), now());

-- Só quem administra o projeto (aqui, o dono do banco) promove alguém a admin.
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000e3');

create or replace function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', false)::text, true);
end;
$$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa do mestre', 'Mestre') r;
grant select on ctx to authenticated;
insert into public.map_assets (owner_id, name, storage_path, size_bytes)
values ('00000000-0000-0000-0000-0000000000e1', 'Dragão', '00000000-0000-0000-0000-0000000000e1/dragao.glb', 100);

-- Quem não é admin nem é da mesa não vê nada dela
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select is(public.is_admin(), false, 'conta comum não é admin');
select is((select count(*)::int from public.rooms where id = (select room_id from ctx)), 0,
  'conta comum de fora não vê a mesa');
select is((select count(*)::int from public.map_assets), 0, 'conta comum não vê modelo alheio');
select throws_ok($$ insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000e2') $$,
  '42501', null, 'ninguém se promove a admin pelo app');

-- O admin vê e mexe sem nem entrar
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e3');
select is(public.is_admin(), true, 'admin se reconhece');
select is((select count(*)::int from public.rooms where id = (select room_id from ctx)), 1,
  'admin vê qualquer mesa');
update public.rooms set name = 'Renomeada pelo admin' where id = (select room_id from ctx);
select is((select name from public.rooms where id = (select room_id from ctx)), 'Renomeada pelo admin',
  'admin edita a mesa como mestre');
select is((select count(*)::int from public.map_assets where name = 'Dragão'), 1,
  'admin vê os modelos de todos os mestres');

-- Ao entrar, o admin vira mestre; o jogador comum continua jogador
select public.join_room((select slug from ctx), 'Admin');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select public.join_room((select slug from ctx), 'Jogador');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select is((select role from public.room_members where user_id = '00000000-0000-0000-0000-0000000000e3'), 'gm',
  'admin entra como mestre');
select is((select role from public.room_members where user_id = '00000000-0000-0000-0000-0000000000e2'), 'player',
  'conta comum entra como jogador');

select * from finish();
rollback;
