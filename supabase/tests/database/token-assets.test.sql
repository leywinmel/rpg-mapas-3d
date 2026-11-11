-- Testes do token com modelo .glb próprio (tokens próprios). Rodar: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Usuários: mestre, jogadora Ana e um outro mestre, dono de um modelo que não é desta mesa
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mestre@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@teste.local', '{"display_name":"Ana"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outro@teste.local', '{}', false, now(), now());

create or replace function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', false)::text, true);
end;
$$;

-- O outro mestre envia um modelo para a biblioteca dele
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
insert into public.map_assets (id, owner_id, name, storage_path, size_bytes) values
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000a4', 'Alheio',
   '00000000-0000-0000-0000-0000000000a4/00000000-0000-0000-0000-0000000000e4.glb', 1000);

-- O mestre cria a mesa, um mapa e envia um modelo
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa dos modelos', 'Mestre') r;
grant select on ctx to authenticated;
insert into public.maps (id, owner_id, room_id, name, width, depth, schema_version, document)
values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1',
        (select room_id from ctx), 'Cripta', 20, 20, 2,
        '{"version": 2, "ambience": {"preset": "masmorra", "fogColor": "#0d0b14", "light": 0.6}}');
insert into public.map_assets (id, owner_id, name, storage_path, size_bytes) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'Fera',
   '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000e1.glb', 1000);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
do $$ begin perform public.join_room((select slug from ctx), 'Ana'); end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ insert into public.tokens (id, map_id, kind, name, model_asset_id, x, z) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', 'asset', 'Fera',
   '00000000-0000-0000-0000-0000000000e1', 3, 3) $$,
  'mestre cria token com modelo da própria biblioteca');
select throws_ok($$ insert into public.tokens (map_id, kind, name, model_asset_id, x, z) values
  ('00000000-0000-0000-0000-00000000b001', 'asset', 'Roubado', '00000000-0000-0000-0000-0000000000e4', 4, 4) $$,
  '42501', null, 'modelo de outra pessoa é recusado');
select throws_ok($$ insert into public.tokens (map_id, kind, name, x, z) values
  ('00000000-0000-0000-0000-00000000b001', 'asset', 'Sem modelo', 4, 4) $$,
  '23514', null, 'token de modelo enviado sem modelo é recusado');
select throws_ok($$ insert into public.tokens (map_id, kind, name, model_key, model_asset_id, x, z) values
  ('00000000-0000-0000-0000-00000000b001', 'model', 'Misturado', 'figure', '00000000-0000-0000-0000-0000000000e1', 4, 4) $$,
  '23514', null, 'boneco pronto não aponta para modelo enviado');
select throws_ok($$ update public.tokens set model_asset_id = null where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '42501', null, 'o modelo do token não muda depois de criado');

-- A jogadora vê o token e consegue ler o modelo do mestre para baixar o arquivo
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select model_asset_id from public.tokens where id = '00000000-0000-0000-0000-0000000000c1'),
  '00000000-0000-0000-0000-0000000000e1'::uuid, 'jogadora vê o token com o modelo');
select is((select count(*)::int from public.map_assets where id = '00000000-0000-0000-0000-0000000000e1'),
  1, 'jogadora lê o modelo do mestre');
select is((select count(*)::int from public.map_assets where id = '00000000-0000-0000-0000-0000000000e4'),
  0, 'jogadora não lê o modelo de quem não é mestre dela');

-- Apagar o modelo da biblioteca deixa o token na mesa, sem modelo
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
delete from public.map_assets where id = '00000000-0000-0000-0000-0000000000e1';
select is((select count(*)::int from public.tokens where id = '00000000-0000-0000-0000-0000000000c1'),
  1, 'token continua depois de apagar o modelo');
select is((select model_asset_id from public.tokens where id = '00000000-0000-0000-0000-0000000000c1'),
  null, 'token fica sem modelo (caixa no lugar)');

select * from finish();
rollback;
