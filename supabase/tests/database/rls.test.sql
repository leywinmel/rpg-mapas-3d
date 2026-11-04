-- Testes de integração das regras de acesso (RLS). Rodar: npm run test:db
-- Cada teste "vira" um usuário trocando o JWT da sessão e confere o que ele enxerga.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- Usuários: mestre (conta), jogador A (conta), jogador B (convidado anônimo), intruso (fora da mesa)
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mestre@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jogador@teste.local', '{"display_name":"Ana"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '{}', true, now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'intruso@teste.local', '{}', false, now(), now());

select is((select count(*)::int from public.profiles where id::text like '00000000-0000-0000-0000-0000000000a%'), 4,
  'perfil nasce sozinho para cada conta, inclusive convidado');

-- Helper local: assumir a identidade de um usuário
create or replace function pg_temp.act_as(p_user uuid, p_anon boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end;
$$;

-- Mestre cria a mesa e um mapa
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa de teste', 'Mestre') r;
grant select on ctx to authenticated, anon;
insert into public.maps (id, owner_id, room_id, name, width, depth)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
        (select room_id from ctx), 'Taverna', 10, 10);
update public.rooms set active_map_id = '00000000-0000-0000-0000-0000000000b1' where id = (select room_id from ctx);

-- Convidado não cria mesa
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
select throws_ok($$ select public.create_room('Mesa do convidado', 'B') $$, '42501', null,
  'convidado sem conta não cria mesa');

-- Jogadores entram pelo link
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok(format($$ select public.join_room(%L, 'Ana') $$, (select slug from ctx)),
  'jogador com conta entra pelo link');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
select lives_ok(format($$ select public.join_room(%L, 'Bia') $$, (select slug from ctx)),
  'convidado entra pelo link com apelido');

-- Mestre coloca tokens: um de cada jogador, um escondido e um sob a névoa
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.tokens (id, map_id, owner_id, kind, name, model_key, x, z, hidden) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'model', 'Ana', 'figure', 1, 1, false),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a3', 'model', 'Bia', 'figure', 2, 1, false),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b1', null, 'model', 'Emboscada', 'creature', 5, 5, true),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000b1', null, 'model', 'Na névoa', 'creature', 0, 9, false);
-- Névoa cobrindo só a casa (x=0, z=9): pedaço (0, 0), bit 9 · 32 + 0 = 288
insert into public.map_fog (map_id, enabled)
values ('00000000-0000-0000-0000-0000000000b1', true);
insert into public.map_fog_chunks (map_id, cx, cz, covered)
values ('00000000-0000-0000-0000-0000000000b1', 0, 0, set_bit(0::bit(1024), 288, 1));
-- Anotação secreta só para a Ana e uma para todos
insert into public.notes (id, room_id, author_id, title, to_all) values
  ('00000000-0000-0000-0000-0000000000d1', (select room_id from ctx), '00000000-0000-0000-0000-0000000000a1', 'Segredo da Ana', false),
  ('00000000-0000-0000-0000-0000000000d2', (select room_id from ctx), '00000000-0000-0000-0000-0000000000a1', 'Para todos', true);
insert into public.note_recipients (note_id, user_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a2');
-- Rolagem escondida do mestre
insert into public.dice_rolls (room_id, roller_id, notation, results, total, hidden)
values ((select room_id from ctx), '00000000-0000-0000-0000-0000000000a1', '1d20', '[{"sides":20,"value":17}]', 17, true);

select is((select count(*)::int from public.tokens), 4, 'mestre vê todos os tokens');

-- Visão do convidado (Bia)
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
select is((select count(*)::int from public.tokens), 2, 'jogador não recebe token escondido nem sob névoa');
select is((select count(*)::int from public.notes), 1, 'jogador só vê anotação destinada a ele');
select is((select count(*)::int from public.dice_rolls), 0, 'jogador não vê rolagem escondida do mestre');
select throws_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, total, hidden)
  values ((select room_id from ctx), '00000000-0000-0000-0000-0000000000a3', '1d6', '[{"sides":6,"value":3}]', 3, true) $$,
  '42501', null, 'jogador não pode rolar escondido');
select lives_ok($$ insert into public.dice_rolls (room_id, roller_id, notation, results, total)
  values ((select room_id from ctx), '00000000-0000-0000-0000-0000000000a3', '1d6', '[{"sides":6,"value":3}]', 3) $$,
  'jogador rola dado público');

-- Jogador move o próprio token, não o dos outros, e não troca o dono
update public.tokens set x = 3 where id = '00000000-0000-0000-0000-0000000000c2';
select is((select x from public.tokens where id = '00000000-0000-0000-0000-0000000000c2'), 3, 'jogador move o próprio token');
update public.tokens set x = 4 where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select x from public.tokens where id = '00000000-0000-0000-0000-0000000000c1'), 1, 'jogador não move token alheio');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
select throws_ok($$ update public.tokens set hidden = true where id = '00000000-0000-0000-0000-0000000000c2' $$,
  '42501', null, 'jogador não mexe em campo restrito do próprio token');

-- Jogador não edita o mapa nem a névoa
update public.maps set name = 'Hackeado' where id = '00000000-0000-0000-0000-0000000000b1';
update public.map_fog set enabled = false where map_id = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select name from public.maps where id = '00000000-0000-0000-0000-0000000000b1'), 'Taverna', 'jogador não edita o mapa');
select is((select enabled from public.map_fog where map_id = '00000000-0000-0000-0000-0000000000b1'), true, 'jogador não desliga a névoa');

-- Visão da Ana: recebe o segredo dela
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.notes), 2, 'destinatária vê o segredo e a anotação geral');

-- Intruso fora da mesa não vê nada
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.rooms), 0, 'intruso não vê a mesa');
select is((select count(*)::int from public.maps), 0, 'intruso não vê o mapa');
select is((select count(*)::int from public.tokens), 0, 'intruso não vê tokens');

-- Canal privado da mesa: só membros entram (o Realtime confere estas regras)
select is(public.room_id_from_topic('room:' || (select room_id from ctx)), (select room_id from ctx),
  'tópico do canal aponta para a mesa');
select is(public.room_id_from_topic('room:nao-e-um-id'), null, 'tópico fora do padrão não aponta para mesa');
select set_config('realtime.topic', 'room:' || (select room_id from ctx), true);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok($$ insert into realtime.messages (topic, extension, event, payload, private)
  values (realtime.topic(), 'broadcast', 'teste', '{}', true) $$, 'jogador da mesa envia no canal privado');
select is((select count(*)::int from realtime.messages where topic = realtime.topic()), 1,
  'jogador da mesa recebe no canal privado');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
select throws_ok($$ insert into realtime.messages (topic, extension, event, payload, private)
  values (realtime.topic(), 'broadcast', 'teste', '{}', true) $$, '42501', null,
  'intruso não envia no canal da mesa');
select is((select count(*)::int from realtime.messages where topic = realtime.topic()), 0,
  'intruso não recebe nada do canal da mesa');

-- Sem login nenhum: nada, a não ser a prévia do convite
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.rooms $$, '42501', null, 'visitante sem login não acessa tabelas');
select is((select name from public.get_room_preview((select slug from ctx))), 'Mesa de teste',
  'visitante sem login vê o nome da mesa no convite');
select is((select count(*)::int from public.get_room_preview('nao-existe')), 0,
  'link inválido não devolve mesa ao visitante');

select * from finish();
rollback;
