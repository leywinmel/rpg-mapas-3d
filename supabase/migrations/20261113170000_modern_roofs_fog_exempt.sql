-- RPG-52: os telhados de duas águas das casas de reboco do moderno também ficam de fora do
-- recorte da névoa (o jogador vê o telhado da casa coberta, como nos telhados do medieval).
insert into public.fog_exempt_pieces (key) values
  ('mod-telhado-ardosia-2x2'),
  ('mod-telhado-ardosia-2x4'),
  ('mod-telhado-ardosia-4x4'),
  ('mod-telhado-barro-2x2'),
  ('mod-telhado-barro-2x4'),
  ('mod-telhado-barro-4x4')
on conflict (key) do nothing;
