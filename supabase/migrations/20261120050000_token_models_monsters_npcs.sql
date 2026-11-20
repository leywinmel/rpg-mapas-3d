-- RPG-32 (parte 2): mais bonecos 3D prontos (Quaternius, CC0): monstros, mortos-vivos, horror
-- cósmico, moderno e cyberpunk e gente da cidade. Os códigos são os mesmos de TOKEN_MODELS em
-- src/features/tokens/constants.ts; um teste Vitest garante que as duas listas não divergem.
insert into public.token_models (code, label) values
  ('goblin', 'Goblin'),
  ('orc', 'Orc'),
  ('yeti', 'Yeti'),
  ('slime', 'Gosma'),
  ('spider', 'Aranha gigante'),
  ('mushroom-king', 'Rei cogumelo'),
  ('demon', 'Diabrete'),
  ('zombie', 'Zumbi'),
  ('ghost', 'Fantasma'),
  ('tentacle', 'Tentáculo'),
  ('alien', 'Criatura cósmica'),
  ('swat', 'Agente tático'),
  ('soldier', 'Mercenária'),
  ('hazmat', 'Traje de proteção'),
  ('robot', 'Drone de combate'),
  ('farmer', 'Fazendeiro'),
  ('king', 'Rei'),
  ('witch', 'Bruxa')
on conflict (code) do update set label = excluded.label;
