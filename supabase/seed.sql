-- Dados de exemplo para desenvolvimento local (aplicados no npm run db:reset).
-- Contas só de teste, que existem apenas no Supabase local; nunca use estas senhas fora daqui.
--   mestre@rpgmaps.test  / senha: mesa-local-123  (mestre da mesa de demonstração)
--   jogador@rpgmaps.test / senha: mesa-local-123  (jogador da mesma mesa)

-- O Auth exige as colunas de token como texto vazio (não nulo) para o login funcionar.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'mestre@rpgmaps.test',
   extensions.crypt('mesa-local-123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Mestre de Teste"}',
   false, now(), now(), '', '', '', ''),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'jogador@rpgmaps.test',
   extensions.crypt('mesa-local-123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Ana Jogadora"}',
   false, now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.email in ('mestre@rpgmaps.test', 'jogador@rpgmaps.test');

-- Mesa de demonstração com link fixo /sala/demo e um mapa 12×12 de piso de pedra.
insert into public.rooms (id, slug, name, owner_id)
values ('33333333-3333-4333-8333-333333333333', 'demo', 'Mesa de demonstração',
        '11111111-1111-4111-8111-111111111111');

insert into public.room_members (room_id, user_id, role, nickname)
values
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'gm', 'Mestre'),
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'player', 'Ana');

insert into public.maps (id, owner_id, room_id, name, width, depth, document)
select '44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111',
       '33333333-3333-4333-8333-333333333333', 'Cripta do Corvo', 12, 12,
       jsonb_build_object(
         'version', 1,
         'ambience', jsonb_build_object('preset', 'masmorra', 'fogColor', '#0d0b14', 'light', 0.6),
         'floors', (
           select jsonb_agg(jsonb_build_object('x', x, 'z', z, 'tile', 'piso-pedra', 'height', 0) order by z, x)
           from generate_series(0, 11) as z, generate_series(0, 11) as x
         ),
         'walls', '[]'::jsonb,
         'props', '[]'::jsonb
       );

update public.rooms set active_map_id = '44444444-4444-4444-8444-444444444444'
where id = '33333333-3333-4333-8333-333333333333';
