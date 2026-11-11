-- RPG-31: telhados e paredes imunes à névoa.
--
-- Decisão de 05/11 (answers/2026_11_05 epico-9 001.md, item 2): na área coberta o jogador continua
-- vendo o lado de fora dos prédios (paredes e telhados), a silhueta da cidade por cima da névoa.
-- Chão, relevo, o que está dentro (móveis, objetos, veículos) e tokens seguem escondidos.
--
-- Antes, a parede sumia quando as duas casas dos lados estavam cobertas, a peça sumia quando toda a
-- pegada estava, e o pedaço todo coberto nem saía do banco. Agora a parede fica sempre, a peça de
-- telhado fica sempre, e o pedaço todo coberto sai recortado quando tem parede ou telhado a mostrar.

-- ---------------------------------------------------------------------------
-- 1. Peças que atravessam a névoa
-- ---------------------------------------------------------------------------
-- Os telhados do catálogo (category 'roof' em src/features/scene/catalog/pack-pieces.ts). O banco
-- não conhece o catálogo, por isso a lista mora numa tabela de domínio e não na função [#3]; o teste
-- src/features/fog/services/fog-exempt-pieces.test.ts confere que ela e o catálogo não divergem.
create table public.fog_exempt_pieces (
  key text primary key
);
insert into public.fog_exempt_pieces (key) values
  ('med-telhado-2x2'),
  ('med-telhado-2x4'),
  ('med-telhado-4x4'),
  ('med-telhado-torre'),
  ('med-toldo-madeira');
alter table public.fog_exempt_pieces enable row level security;
create policy "dominio: leitura" on public.fog_exempt_pieces for select to authenticated using (true);
revoke all on public.fog_exempt_pieces from anon;

-- ---------------------------------------------------------------------------
-- 2. Recorte do pedaço
-- ---------------------------------------------------------------------------
-- Documento do pedaço sem o que está nas casas cobertas: chão vira buraco (altura 0) e a peça some
-- quando todas as casas dela estão cobertas, salvo as de fog_exempt_pieces (telhados). As paredes
-- ficam como estão: são o lado de fora do prédio, e porta e janela são estilos de parede.
create or replace function public.redact_fogged_chunk(
  p_map uuid, p_cx integer, p_cz integer, p_document jsonb, p_bits bit(1024)
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  origin_x  integer := p_cx * 32;
  origin_z  integer := p_cz * 32;
  map_width integer;
  map_depth integer;
  bw        integer;
  bounds    integer[];
  tiles     integer[];
  heights   integer[];
  pieces    jsonb := '[]'::jsonb;
  item      jsonb;
  ix        integer;
  iz        integer;
  fw        integer;
  fd        integer;
  seen      boolean;
begin
  select mp.width, mp.depth into map_width, map_depth from public.maps mp where mp.id = p_map;
  bw := least(32, map_width - origin_x);
  bounds := array[origin_x, origin_z, bw, least(32, map_depth - origin_z)];
  tiles := public.fog_expand_runs(p_document -> 'terrain' -> 'tiles');
  heights := public.fog_expand_runs(p_document -> 'terrain' -> 'heights');
  for i in 1 .. coalesce(array_length(tiles, 1), 0) loop
    if get_bit(p_bits, ((i - 1) / bw) * 32 + (i - 1) % bw) = 1 then
      tiles[i] := 0;
      heights[i] := 0;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_document -> 'pieces', '[]'::jsonb)) loop
    -- Telhado do catálogo atravessa a névoa; o modelo enviado pelo mestre (source 'upload') nunca.
    seen := item -> 'asset' ->> 'source' = 'catalog'
            and exists (select 1 from public.fog_exempt_pieces e where e.key = item -> 'asset' ->> 'key');
    ix := (item ->> 'x')::integer;
    iz := (item ->> 'z')::integer;
    -- Girar um ou três quartos de volta troca largura e profundidade (pieceRect do domínio).
    if (item ->> 'rotation')::integer % 2 = 1 then
      fw := (item -> 'footprint' ->> 'depth')::integer;
      fd := (item -> 'footprint' ->> 'width')::integer;
    else
      fw := (item -> 'footprint' ->> 'width')::integer;
      fd := (item -> 'footprint' ->> 'depth')::integer;
    end if;
    <<cells>>
    for dz in 0 .. fd - 1 loop
      exit cells when seen;
      for dx in 0 .. fw - 1 loop
        if not public.fog_cell_covered_near(p_map, p_bits, bounds, ix + dx, iz + dz) then
          seen := true;
          exit cells;
        end if;
      end loop;
    end loop;
    if seen then
      pieces := pieces || jsonb_build_array(item);
    end if;
  end loop;

  return jsonb_set(
    jsonb_set(
      jsonb_set(p_document, '{terrain,tiles}', public.fog_encode_runs(tiles)),
      '{terrain,heights}', public.fog_encode_runs(heights)),
    '{pieces}', pieces);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Pedaços que o jogador recebe
-- ---------------------------------------------------------------------------
-- Pedaços em parte cobertos e pedaços todo cobertos, recortados, para quem só vê o mapa. O todo
-- coberto sem parede nem telhado continua não saindo: não há nada de fora a mostrar, e o app
-- desenha o chão liso padrão com a névoa por cima. O mestre (quem edita) lê tudo direto da tabela
-- e recebe a lista vazia; quem não vê o mapa também.
create or replace function public.get_fogged_map_chunks(p_map_id uuid)
returns table (cx integer, cz integer, document jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.can_edit_map(p_map_id) or not public.can_view_map(p_map_id) then
    return;
  end if;
  return query
    with redacted as (
      select c.cx as rcx, c.cz as rcz, s.state,
             public.redact_fogged_chunk(p_map_id, c.cx, c.cz, c.document,
                                        public.fog_chunk_bits(p_map_id, c.cx, c.cz)) as rdoc
        from public.map_chunks c
        cross join lateral (select public.fog_chunk_state(p_map_id, c.cx, c.cz) as state) s
       where c.map_id = p_map_id
         and s.state in ('mixed', 'covered')
    )
    select r.rcx, r.rcz, r.rdoc
      from redacted r
     where r.state = 'mixed'
        or jsonb_array_length(coalesce(r.rdoc -> 'walls', '[]'::jsonb)) > 0
        or jsonb_array_length(coalesce(r.rdoc -> 'pieces', '[]'::jsonb)) > 0
     order by r.rcz, r.rcx;
end;
$$;
