-- Testes das anotações do mestre: envio atômico (send_note) e quem enxerga o quê.
-- Rodar: npm run test:db
-- Cada teste "vira" um usuário trocando o JWT da sessão e confere o que ele enxerga.
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

-- Usuários: mestre, jogadora Ana, convidada Bia (anônima), jogador Caio e um intruso fora da mesa
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mestre@teste.local', '{"display_name":"Mestre"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@teste.local', '{"display_name":"Ana"}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '{}', true, now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'intruso@teste.local', '{}', false, now(), now()),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'caio@teste.local', '{"display_name":"Caio"}', false, now(), now());

-- Helper local: assumir a identidade de um usuário
create or replace function pg_temp.act_as(p_user uuid, p_anon boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end;
$$;

-- O mestre cria duas mesas (a segunda serve para provar que a imagem não cruza mesas)
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table ctx as select r.id as room_id, r.slug from public.create_room('Mesa das anotações', 'Mestre') r;
create temp table other_room as select r.id as room_id from public.create_room('Outra mesa', 'Mestre') r;
grant select on ctx, other_room to authenticated, anon;

-- Ana, Bia e Caio entram pelo link
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
do $$ begin perform public.join_room((select slug from ctx), 'Ana'); end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
do $$ begin perform public.join_room((select slug from ctx), 'Bia'); end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a5');
do $$ begin perform public.join_room((select slug from ctx), 'Caio'); end $$;

-- ---------------------------------------------------------------------------
-- Envio para um jogador escolhido: só ele e o mestre enxergam
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select (public.send_note((select room_id from ctx), 'Segredo da Ana', 'Só ela sabe.', null, false,
    array['00000000-0000-0000-0000-0000000000a2']::uuid[])).title),
  'Segredo da Ana', 'send_note devolve a anotação criada');
select is((select count(*)::int from public.notes where title = 'Segredo da Ana'), 1,
  'mestre vê a anotação que mandou');
select is((select count(*)::int from public.note_recipients r join public.notes n on n.id = r.note_id
  where n.title = 'Segredo da Ana'), 1, 'mestre vê o destinatário gravado junto com a anotação');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.notes where title = 'Segredo da Ana'), 1,
  'jogadora escolhida vê a anotação');
select is((select count(*)::int from public.note_recipients r join public.notes n on n.id = r.note_id
  where n.title = 'Segredo da Ana'), 1, 'jogadora escolhida vê a própria linha de destinatário');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
select is((select count(*)::int from public.notes where title = 'Segredo da Ana'), 0,
  'outro membro (convidada) não vê a anotação de outra pessoa');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a5');
select is((select count(*)::int from public.notes where title = 'Segredo da Ana'), 0,
  'outro membro (jogador com conta) não vê a anotação de outra pessoa');

-- ---------------------------------------------------------------------------
-- Vários destinatários: repetidos entram uma vez, e cada um vê só a própria linha
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.send_note((select room_id from ctx), 'Para Ana e Bia', '', null, false,
  array['00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
        '00000000-0000-0000-0000-0000000000a2']::uuid[]) $$,
  'mestre manda para dois jogadores, com um repetido na lista');
select is((select count(*)::int from public.note_recipients r join public.notes n on n.id = r.note_id
  where n.title = 'Para Ana e Bia'), 2, 'destinatário repetido é ignorado e o mestre vê todos');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.note_recipients r join public.notes n on n.id = r.note_id
  where n.title = 'Para Ana e Bia'), 1, 'cada destinatário vê só a própria linha');

-- ---------------------------------------------------------------------------
-- Mesa toda: todo membro vê, e a lista de destinatários é ignorada
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.send_note((select room_id from ctx), 'Aviso geral', 'Para todos.', null, true,
  array['00000000-0000-0000-0000-0000000000a2']::uuid[]) $$,
  'mestre manda para a mesa toda');
select is((select count(*)::int from public.note_recipients r join public.notes n on n.id = r.note_id
  where n.title = 'Aviso geral'), 0, 'anotação para a mesa toda não guarda destinatários');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a5');
select is((select count(*)::int from public.notes where title = 'Aviso geral'), 1,
  'qualquer membro vê a anotação para a mesa toda');

-- Quem está fora da mesa não vê nada
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.notes), 0, 'intruso não vê anotação alguma');
select is((select count(*)::int from public.note_recipients), 0, 'intruso não vê destinatário algum');

-- ---------------------------------------------------------------------------
-- O que o envio recusa
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', true);
select throws_ok($$ select public.send_note((select room_id from ctx), 'Golpe', '', null, true) $$,
  '42501', null, 'jogador não envia anotação');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select public.send_note((select room_id from ctx), 'Sem ninguém', '', null, false,
  array[]::uuid[]) $$,
  '22023', 'Escolha ao menos um jogador para receber a anotação.',
  'recusa jogadores escolhidos com a lista vazia');
select throws_ok($$ select public.send_note((select room_id from ctx), 'Sem ninguém', '', null, false, null) $$,
  '22023', null, 'recusa jogadores escolhidos com a lista nula');
select throws_ok($$ select public.send_note((select room_id from ctx), 'Sem ninguém', '') $$,
  '22023', null, 'esquecer os destinatários nunca manda o segredo para a mesa toda');
select throws_ok($$ select public.send_note((select room_id from ctx), 'Para o intruso', '', null, false,
  array['00000000-0000-0000-0000-0000000000a4']::uuid[]) $$,
  '42501', null, 'destinatário que não é da mesa é recusado');
select is((select count(*)::int from public.notes where title = 'Para o intruso'), 0,
  'envio que falha não deixa a anotação para trás');
select throws_ok($$ select public.send_note((select room_id from ctx), '', '', null, true) $$,
  '23514', null, 'título vazio é recusado');

-- Imagem: só dentro da pasta da própria mesa
select throws_ok($$ select public.send_note((select room_id from ctx), 'Mapa roubado', '',
  (select room_id from other_room) || '/mapa.png', true) $$,
  '23514', null, 'imagem da pasta de outra mesa é recusada');
select throws_ok($$ select public.send_note((select room_id from ctx), 'Mapa solto', '', 'mapa.png', true) $$,
  '23514', null, 'imagem fora de qualquer pasta de mesa é recusada');
select throws_ok($$ insert into public.notes (room_id, author_id, title, image_path, to_all)
  values ((select room_id from ctx), '00000000-0000-0000-0000-0000000000a1', 'Direto',
          (select room_id from other_room) || '/mapa.png', true) $$,
  '23514', null, 'a regra da imagem vale também para INSERT direto na tabela');
select lives_ok($$ select public.send_note((select room_id from ctx), 'Com imagem', '',
  (select room_id from ctx) || '/mapa.png', false,
  array['00000000-0000-0000-0000-0000000000a2']::uuid[]) $$,
  'imagem na pasta da própria mesa é aceita');

-- ---------------------------------------------------------------------------
-- Imagem no Storage: só lê quem pode ler a anotação
-- ---------------------------------------------------------------------------
insert into storage.objects (bucket_id, name, owner)
values ('note-images', (select room_id from ctx) || '/mapa.png', '00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from storage.objects where bucket_id = 'note-images'), 1,
  'mestre envia e vê a imagem da anotação');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from storage.objects where bucket_id = 'note-images'), 1,
  'destinatária da anotação vê a imagem');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a5');
select is((select count(*)::int from storage.objects where bucket_id = 'note-images'), 0,
  'membro que não recebeu a anotação não vê a imagem');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from storage.objects where bucket_id = 'note-images'), 0,
  'intruso não vê a imagem');

-- ---------------------------------------------------------------------------
-- Editar e apagar: só o mestre
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
update public.notes set title = 'Adulterada' where title = 'Segredo da Ana';
delete from public.notes where title = 'Segredo da Ana';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.notes where title = 'Segredo da Ana'), 1,
  'jogador não edita nem apaga anotação');

update public.notes set title = 'Segredo revisado' where title = 'Segredo da Ana';
select is((select count(*)::int from public.notes where title = 'Segredo revisado'), 1, 'mestre edita a anotação');

create temp table doomed as select id from public.notes where title = 'Segredo revisado';
grant select on doomed to authenticated;
delete from public.notes where title = 'Segredo revisado';
select is((select count(*)::int from public.notes where title = 'Segredo revisado'), 0, 'mestre apaga a anotação');
select is((select count(*)::int from public.note_recipients where note_id in (select id from doomed)), 0,
  'apagar a anotação leva junto os destinatários');

-- ---------------------------------------------------------------------------
-- Sem login nenhum: não executa a função
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select public.send_note('00000000-0000-0000-0000-000000000001', 'Visitante', '', null, true) $$,
  '42501', null, 'visitante sem login não executa send_note');

reset role;
select * from finish();
rollback;
