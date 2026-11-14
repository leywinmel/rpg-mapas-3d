-- Bonecos 3D prontos do Quaternius (RPG Characters e Animated Monster Pack, CC0). Os códigos são
-- os mesmos de TOKEN_MODELS em src/features/tokens/constants.ts; um teste Vitest garante que as
-- duas listas não divergem.
insert into public.token_models (code, label) values
  ('cleric', 'Clérigo'),
  ('monk', 'Monge'),
  ('ranger', 'Patrulheira'),
  ('thief', 'Assassino encapuzado'),
  ('warrior', 'Guerreiro'),
  ('wizard', 'Arquimago'),
  ('bat', 'Morcego gigante'),
  ('dragon', 'Dragão filhote')
on conflict (code) do update set label = excluded.label;
