-- RPG-32: bonecos 3D prontos (KayKit Adventurers e Skeletons, CC0). Os códigos são os mesmos de
-- TOKEN_MODELS em src/features/tokens/constants.ts, que aponta o arquivo de cada um; um teste
-- Vitest garante que as duas listas não divergem.
insert into public.token_models (code, label) values
  ('knight', 'Cavaleiro'),
  ('barbarian', 'Bárbaro'),
  ('mage', 'Mago'),
  ('rogue', 'Ladino'),
  ('rogue-hooded', 'Ladino encapuzado'),
  ('skeleton-warrior', 'Esqueleto guerreiro'),
  ('skeleton-mage', 'Esqueleto mago'),
  ('skeleton-rogue', 'Esqueleto ladino'),
  ('skeleton-minion', 'Esqueleto servo')
on conflict (code) do update set label = excluded.label;
