-- RPG-51: animais como tokens (Quaternius, CC0), numa categoria própria do seletor de boneco. Os
-- códigos são os mesmos de TOKEN_MODELS em src/features/tokens/constants.ts; um teste Vitest
-- garante que as duas listas não divergem.
insert into public.token_models (code, label) values
  ('cat', 'Gato'),
  ('dog', 'Cachorro'),
  ('rat', 'Rato'),
  ('chicken', 'Galinha'),
  ('pig', 'Porco'),
  ('sheep', 'Ovelha'),
  ('fox', 'Raposa'),
  ('wolf', 'Lobo'),
  ('deer', 'Cervo'),
  ('cow', 'Vaca'),
  ('horse', 'Cavalo')
on conflict (code) do update set label = excluded.label;
