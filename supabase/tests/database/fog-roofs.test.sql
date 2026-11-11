-- Testes dos telhados e paredes imunes à névoa (RPG-31). Rodar: npm run test:db
-- Na área coberta o jogador recebe o lado de fora dos prédios (paredes e telhados), mas não o chão,
-- o relevo, o que está dentro (móveis, veículos) nem um pedaço coberto sem nada de fora a mostrar.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Usuários: mestre, jogadora Ana e um estranho fora da mesa
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mestre@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@teste.local', '{"display_name":"Ana"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'estranho@teste.local', '{}', false, now(), now());

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

-- Uma casa de 4×4 (x 10..13, z 10..13) sobre um morro (degrau 2): paredes com porta na frente,
-- assoalho e escada dentro, carroça na porta e telhado de duas águas por cima (degrau 8).
create or replace function pg_temp.house_chunk() returns jsonb
language sql as $$ select '{
  "version": 2,
  "terrain": {"palette": ["med-calcamento"], "tiles": [1, 1024], "heights": [2, 1024]},
  "walls": [
    {"x": 10, "z": 10, "side": "north", "style": "med-parede-reboco", "height": 8, "level": 2},
    {"x": 11, "z": 10, "side": "north", "style": "med-reboco-porta", "height": 8, "level": 2},
    {"x": 10, "z": 11, "side": "west", "style": "med-parede-reboco", "height": 8, "level": 2},
    {"x": 12, "z": 12, "side": "west", "style": "med-parede-reboco", "height": 8, "level": 2}
  ],
  "pieces": [
    {"id": "roof", "asset": {"source": "catalog", "key": "med-telhado-4x4"}, "x": 10, "z": 10, "level": 10, "rotation": 0, "footprint": {"width": 4, "depth": 4}, "scale": 1},
    {"id": "floor", "asset": {"source": "catalog", "key": "med-assoalho-escuro"}, "x": 10, "z": 10, "level": 2, "rotation": 0, "footprint": {"width": 1, "depth": 1}, "scale": 1},
    {"id": "stairs", "asset": {"source": "catalog", "key": "med-escada-interna"}, "x": 11, "z": 11, "level": 2, "rotation": 0, "footprint": {"width": 1, "depth": 2}, "scale": 1},
    {"id": "cart", "asset": {"source": "catalog", "key": "med-carroca"}, "x": 11, "z": 8, "level": 2, "rotation": 1, "footprint": {"width": 1, "depth": 2}, "scale": 1},
    {"id": "upload", "asset": {"source": "upload", "assetId": "00000000-0000-0000-0000-0000000000e1"}, "x": 20, "z": 20, "level": 2, "rotation": 0, "footprint": {"width": 1, "depth": 1}, "scale": 1}
  ]
}'::jsonb $$;

-- Pedaço sem parede nem telhado: só barris no chão.
create or replace function pg_temp.yard_chunk() returns jsonb
language sql as $$ select '{
  "version": 2,
  "terrain": {"palette": ["med-calcamento"], "tiles": [1, 1024], "heights": [0, 1024]},
  "walls": [],
  "pieces": [
    {"id": "barrel", "asset": {"source": "catalog", "key": "med-caixote"}, "x": 2, "z": 2, "level": 0, "rotation": 0, "footprint": {"width": 1, "depth": 1}, "scale": 1}
  ]
}'::jsonb $$;

-- Revela as linhas z = 0 a 4 do pedaço: 160 casas à vista, 864 cobertas (a casa fica no escuro).
create or replace function pg_temp.top_rows_revealed() returns text
language sql as $$ select repeat('0', 160) || repeat('1', 864) $$;

-- O mestre cria a mesa e um mapa v2 de 64×64 (2×2 pedaços): a casa em (0,0) e em (0,1), o pátio em (1,0)
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa dos telhados', 'Mestre') r;
grant select on ctx to authenticated;
insert into public.maps (id, owner_id, room_id, name, width, depth, schema_version, document)
values ('00000000-0000-0000-0000-00000000b101', '00000000-0000-0000-0000-0000000000d1', (select room_id from ctx),
        'Vila', 64, 64, 2, pg_temp.header());
insert into public.map_chunks (map_id, cx, cz, document)
values ('00000000-0000-0000-0000-00000000b101', 0, 0, pg_temp.house_chunk()),
       ('00000000-0000-0000-0000-00000000b101', 0, 1, pg_temp.house_chunk()),
       ('00000000-0000-0000-0000-00000000b101', 1, 0, pg_temp.yard_chunk());

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
do $$ begin perform public.join_room((select slug from ctx), 'Ana'); end $$;

-- ---------------------------------------------------------------------------
-- A tabela de domínio
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.fog_exempt_pieces), 5, 'jogadora lê a lista de peças imunes à névoa');
select throws_ok($$ insert into public.fog_exempt_pieces (key) values ('med-cama') $$,
  '42501', null, 'ninguém grava na lista de peças imunes pelo app');

-- ---------------------------------------------------------------------------
-- O mestre cobre tudo e revela só o alto do pedaço (0, 1)
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$ select public.save_map_fog('00000000-0000-0000-0000-00000000b101', true, true,
  jsonb_build_array(jsonb_build_object('cx', 0, 'cz', 1, 'covered', pg_temp.top_rows_revealed()))) $$,
  'mestre cobre tudo e revela o alto de um pedaço');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b101'), 3,
  'mestre lê todos os pedaços');
select is((select count(*)::int from public.get_fogged_map_chunks('00000000-0000-0000-0000-00000000b101')), 0,
  'mestre não precisa dos pedaços recortados');

-- ---------------------------------------------------------------------------
-- O que a jogadora recebe
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b101'), 0,
  'jogadora não lê nenhum pedaço direto');
create temp table redacted as
  select * from public.get_fogged_map_chunks('00000000-0000-0000-0000-00000000b101');
select results_eq($$ select cx, cz from redacted order by cz, cx $$, $$ values (0, 0), (0, 1) $$,
  'pedaço todo coberto com casa vem recortado; o pátio todo coberto, sem nada de fora, não vem');

-- Pedaço (0, 0): todo coberto
select is((select document -> 'terrain' from redacted where cx = 0 and cz = 0),
  '{"palette": ["med-calcamento"], "tiles": [0, 1024], "heights": [0, 1024]}'::jsonb,
  'todo coberto: chega sem chão e sem o morro');
select is((select jsonb_array_length(document -> 'walls') from redacted where cx = 0 and cz = 0), 4,
  'todo coberto: todas as paredes chegam, porta inclusive');
select is((select document -> 'walls' from redacted where cx = 0 and cz = 0),
  (select pg_temp.house_chunk() -> 'walls'),
  'todo coberto: as paredes chegam intactas');
select results_eq($$ select p ->> 'id' from redacted, jsonb_array_elements(document -> 'pieces') p where cx = 0 and cz = 0 $$,
  $$ values ('roof'::text) $$,
  'todo coberto: só o telhado chega; assoalho, escada, carroça e modelo enviado ficam escondidos');

-- Pedaço (0, 1): em parte coberto, a casa inteira no escuro
select is((select document -> 'terrain' -> 'tiles' from redacted where cx = 0 and cz = 1),
  '[1, 160, 0, 864]'::jsonb, 'em parte coberto: só as casas reveladas têm chão');
select is((select jsonb_array_length(document -> 'walls') from redacted where cx = 0 and cz = 1), 4,
  'em parte coberto: parede no meio do escuro também chega');
select results_eq($$ select p ->> 'id' from redacted, jsonb_array_elements(document -> 'pieces') p where cx = 0 and cz = 1 $$,
  $$ values ('roof'::text) $$,
  'em parte coberto: telhado no escuro chega, o resto da casa não');

-- O estranho não recebe nada
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select is((select count(*)::int from public.get_fogged_map_chunks('00000000-0000-0000-0000-00000000b101')), 0,
  'quem é de fora não recebe pedaço recortado');

-- Revelar a casa devolve o interior
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$ select public.save_map_fog('00000000-0000-0000-0000-00000000b101', true, false, p_reset => true) $$,
  'mestre revela tudo');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select is((select count(*)::int from public.map_chunks where map_id = '00000000-0000-0000-0000-00000000b101'), 3,
  'com tudo revelado a jogadora lê os pedaços direto');
select is((select count(*)::int from public.get_fogged_map_chunks('00000000-0000-0000-0000-00000000b101')), 0,
  'com tudo revelado não há pedaço recortado');
select is((select jsonb_array_length(document -> 'pieces') from public.map_chunks
  where map_id = '00000000-0000-0000-0000-00000000b101' and cx = 0 and cz = 0), 5,
  'com tudo revelado a casa chega inteira');

select * from finish();
rollback;
