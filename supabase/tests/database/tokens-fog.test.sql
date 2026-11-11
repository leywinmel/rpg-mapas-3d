-- Testes dos tokens (RPG-8/9) e da névoa em pedaços (RPG-11). Rodar: npm run test:db
-- Cada teste "vira" um usuário trocando o JWT da sessão e confere o que ele enxerga e grava.
begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

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

create or replace function pg_temp.header() returns jsonb
language sql as $$ select '{"version": 2, "ambience": {"preset": "masmorra", "fogColor": "#0d0b14", "light": 0.6}}'::jsonb $$;

-- Pedaço (0, 0) de 32×32: chão de pedra no degrau 2, duas paredes e três peças.
create or replace function pg_temp.chunk() returns jsonb
language sql as $$ select '{
  "version": 2,
  "terrain": {"palette": ["piso-pedra"], "tiles": [1, 1024], "heights": [2, 1024]},
  "walls": [
    {"x": 5, "z": 5, "side": "north", "style": "parede-pedra", "height": 4, "level": 2},
    {"x": 20, "z": 20, "side": "west", "style": "parede-pedra", "height": 4, "level": 2},
    {"x": 6, "z": 10, "side": "north", "style": "parede-pedra", "height": 4, "level": 2}
  ],
  "pieces": [
    {"id": "a", "asset": {"source": "catalog", "key": "barril"}, "x": 2, "z": 2, "level": 2, "rotation": 0, "footprint": {"width": 1, "depth": 1}, "scale": 1},
    {"id": "b", "asset": {"source": "catalog", "key": "barril"}, "x": 20, "z": 20, "level": 2, "rotation": 0, "footprint": {"width": 2, "depth": 2}, "scale": 1},
    {"id": "c", "asset": {"source": "catalog", "key": "carroca"}, "x": 3, "z": 10, "level": 2, "rotation": 1, "footprint": {"width": 1, "depth": 4}, "scale": 1}
  ]
}'::jsonb $$;

-- Revela as linhas z = 0 a 9 do pedaço (0, 0): 320 casas à vista, 704 cobertas.
create or replace function pg_temp.top_rows_revealed() returns text
language sql as $$ select repeat('0', 320) || repeat('1', 704) $$;

-- O mestre cria a mesa, um mapa v2 de 40×40 (2×2 pedaços) e um mapa ainda no v1
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa da névoa', 'Mestre') r;
grant select on ctx to authenticated;
insert into public.maps (id, owner_id, room_id, name, width, depth, schema_version, document)
values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', (select room_id from ctx),
   'Cripta', 40, 40, 2, pg_temp.header()),
  ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000a1', (select room_id from ctx),
   'Antigo', 20, 20, 1, '{"version": 1}');
insert into public.map_chunks (map_id, cx, cz, document)
values ('00000000-0000-0000-0000-00000000b001', 0, 0, pg_temp.chunk()),
       -- O pedaço (1, 1) é de borda (8×8 casas) e vazio: o terreno tem só 64 casas, como o domínio
       -- grava, e nada de parede ou peça (a peça mora no pedaço onde está a âncora dela).
       ('00000000-0000-0000-0000-00000000b001', 1, 1, pg_temp.chunk() - 'walls' - 'pieces'
         || '{"walls": [], "pieces": [], "terrain": {"palette": ["piso-pedra"], "tiles": [1, 64], "heights": [2, 64]}}');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
do $$ begin perform public.join_room((select slug from ctx), 'Ana'); end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
do $$ begin perform public.join_room((select slug from ctx), 'Bia'); end $$;

-- ---------------------------------------------------------------------------
-- Tokens: quem cria e onde cabe
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$ insert into public.tokens (map_id, kind, name, model_key, x, z)
  values ('00000000-0000-0000-0000-00000000b001', 'model', 'Pirata', 'figure', 1, 1) $$,
  '42501', null, 'jogador não cria token');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ insert into public.tokens (id, map_id, owner_id, kind, name, model_key, color_primary, x, z) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a2', 'model', 'Ana', 'figure', '#aa3322', 5, 5),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000b001', null, 'model', 'Esqueleto', 'creature', null, 5, 20),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-00000000b001', null, 'model', 'Emboscada', 'creature', null, 1, 1),
  ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a2', 'model', 'Familiar da Ana', 'creature', null, 10, 30) $$,
  'mestre cria tokens de boneco, com ou sem dono');
select lives_ok($$ insert into public.tokens (id, map_id, kind, name, image_path, x, z, size) values
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000b001', 'image', 'Ogro',
   '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-0000000000f1.png', 4, 9, 2) $$,
  'mestre cria token de imagem 2×2');
update public.tokens set hidden = true where id = '00000000-0000-0000-0000-0000000000c4';
select throws_ok($$ insert into public.tokens (map_id, kind, name, image_path, x, z)
  values ('00000000-0000-0000-0000-00000000b001', 'image', 'Ruim', '../segredo.png', 1, 1) $$,
  '23514', null, 'caminho de imagem fora do formato é recusado');
select throws_ok($$ insert into public.tokens (map_id, kind, name, model_key, x, z)
  values ('00000000-0000-0000-0000-00000000b001', 'model', 'Ruim', 'dragao', 1, 1) $$,
  '23503', null, 'boneco que não existe é recusado');
select throws_ok($$ insert into public.tokens (map_id, kind, name, model_key, x, z, size)
  values ('00000000-0000-0000-0000-00000000b001', 'model', 'Gigante', 'figure', 39, 0, 2) $$,
  '22023', null, 'token que passa da borda do mapa é recusado');
select throws_ok($$ insert into public.tokens (map_id, owner_id, kind, name, model_key, x, z)
  values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a4', 'model', 'Intruso', 'figure', 1, 1) $$,
  '22023', null, 'dono do token precisa ser da mesa');

-- ---------------------------------------------------------------------------
-- Tokens: quem mexe no quê (RPG-9)
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok($$ update public.tokens set x = 6, z = 6, level = 4, hp_current = 7, notes = 'ferida no braço'
  where id = '00000000-0000-0000-0000-0000000000c1' $$, 'jogadora move e anota o próprio token');
select is((select x from public.tokens where id = '00000000-0000-0000-0000-0000000000c1'), 6, 'a posição gravou');
select throws_ok($$ update public.tokens set size = 2 where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '42501', null, 'jogadora não muda o tamanho do próprio token');
select throws_ok($$ update public.tokens set hp_max = 99 where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '42501', null, 'jogadora não muda a vida máxima do próprio token');
select throws_ok($$ update public.tokens set x = 40 where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '22023', null, 'nem o dono tira o token do mapa');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
update public.tokens set x = 2 where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select x from public.tokens where id = '00000000-0000-0000-0000-0000000000c1'), 6,
  'convidada não move o token da Ana');
select lives_ok($$ update public.tokens set name = 'Ana, a ruiva', hp_max = 12, size = 1
  where id = '00000000-0000-0000-0000-0000000000c1' $$, 'mestre muda qualquer campo');

-- ---------------------------------------------------------------------------
-- Névoa: quem grava
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$ select public.save_map_fog('00000000-0000-0000-0000-00000000b001', true, true) $$,
  '42501', null, 'jogadora não mexe na névoa');
select throws_ok($$ insert into public.map_fog (map_id, enabled) values ('00000000-0000-0000-0000-00000000b001', false) $$,
  '42501', null, 'jogadora não cria a névoa direto na tabela');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select public.save_map_fog('00000000-0000-0000-0000-00000000b002', true, true) $$,
  '22023', null, 'mapa ainda no v1 não aceita névoa');
select throws_ok($$ select public.save_map_fog('00000000-0000-0000-0000-00000000b001', true, true,
  '[{"cx": 0, "cz": 0, "covered": "0101"}]'::jsonb) $$,
  '22023', null, 'pedaço de névoa malformado é recusado');
select throws_ok($$ select public.save_map_fog('00000000-0000-0000-0000-00000000b001', true, true,
  jsonb_build_array(jsonb_build_object('cx', 2, 'cz', 0, 'covered', repeat('1', 1024)))) $$,
  '22023', null, 'pedaço de névoa fora do mapa é recusado');
select isnt(public.save_map_fog('00000000-0000-0000-0000-00000000b001', true, true,
  jsonb_build_array(jsonb_build_object('cx', 0, 'cz', 0, 'covered', pg_temp.top_rows_revealed()),
                    jsonb_build_object('cx', 1, 'cz', 0, 'covered', repeat('1', 1024)))),
  null::timestamptz, 'mestre cobre tudo e revela o alto do primeiro pedaço');
select is((select bit_count(covered)::int from public.map_fog_chunks
  where map_id = '00000000-0000-0000-0000-00000000b001' and cx = 1 and cz = 0), 8 * 32,
  'os bits de fora do mapa no pedaço da borda ficam zerados');

-- ---------------------------------------------------------------------------
-- Névoa: o que o jogador recebe
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 2,
  'mestre lê todos os pedaços');
select is((select count(*)::int from public.get_fogged_map_chunks('00000000-0000-0000-0000-00000000b001')), 0,
  'mestre não precisa dos pedaços recortados');
select is((select count(*)::int from public.tokens), 5, 'mestre vê todos os tokens');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 0,
  'jogadora não lê pedaço coberto nem em parte coberto');
select is((select count(*)::int from public.map_fog_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 2,
  'jogadora lê a névoa para desenhá-la');
create temp table redacted as
  select * from public.get_fogged_map_chunks('00000000-0000-0000-0000-00000000b001');
select results_eq($$ select cx, cz from redacted $$, $$ values (0, 0) $$,
  'só o pedaço em parte coberto vem recortado');
select is((select document -> 'terrain' from redacted),
  '{"palette": ["piso-pedra"], "tiles": [1, 320, 0, 704], "heights": [2, 320, 0, 704]}'::jsonb,
  'casas cobertas chegam sem chão e sem altura');
select results_eq($$ select (w ->> 'x')::int, (w ->> 'z')::int from redacted, jsonb_array_elements(document -> 'walls') w $$,
  $$ values (5, 5), (20, 20), (6, 10) $$,
  'toda parede chega, mesmo no meio do escuro (RPG-31: o lado de fora do prédio fica à vista)');
select results_eq($$ select p ->> 'id' from redacted, jsonb_array_elements(document -> 'pieces') p $$,
  $$ values ('a'::text) $$,
  'peça toda no escuro some, mesmo deitada (giro troca largura e profundidade)');
select results_eq(
  $$ select name from public.tokens order by name $$,
  $$ values ('Ana, a ruiva'::text), ('Familiar da Ana'), ('Ogro') $$,
  'jogadora vê o próprio token mesmo no escuro e o ogro na beira da luz; não vê o escondido nem o coberto');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
select results_eq(
  $$ select name from public.tokens order by name $$,
  $$ values ('Ana, a ruiva'::text), ('Ogro') $$,
  'convidada não vê o familiar da Ana, que está no escuro');

-- O estranho não recebe nada
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.get_fogged_map_chunks('00000000-0000-0000-0000-00000000b001')), 0,
  'quem é de fora não recebe pedaço recortado');
select is((select count(*)::int from public.map_fog_chunks), 0, 'quem é de fora não lê a névoa');

-- Revelar tudo volta o mapa inteiro ao jogador
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.save_map_fog('00000000-0000-0000-0000-00000000b001', true, false, p_reset => true) $$,
  'mestre revela tudo');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 2,
  'com tudo revelado a jogadora lê os pedaços direto');
select is((select count(*)::int from public.tokens), 4, 'só o escondido continua fora');

-- Desligar a névoa também libera
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.save_map_fog('00000000-0000-0000-0000-00000000b001', false, true) $$,
  'mestre desliga a névoa');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b001'), 2,
  'névoa desligada não esconde nada');

select * from finish();
rollback;
