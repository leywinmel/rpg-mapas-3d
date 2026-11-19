-- RPG-64: os telhados de beiral curvo do templo japonês também ficam de fora do recorte da
-- névoa (o jogador vê o telhado da casa coberta, como nos outros telhados de duas águas).
insert into public.fog_exempt_pieces (key) values
  ('jap-telhado-2x2'),
  ('jap-telhado-2x4'),
  ('jap-telhado-4x4')
on conflict (key) do nothing;
