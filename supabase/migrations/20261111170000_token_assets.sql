-- Token com modelo .glb próprio (tokens próprios): o mestre envia um modelo para a biblioteca dele
-- (map_assets, bucket map-models) e o usa como token. Quem está na mesa já lê os modelos do mestre
-- (política "modelos: dono e jogadores do mestre veem"), então o jogador vê o token sem nada novo.

insert into public.token_kinds (code, label) values ('asset', 'Modelo enviado');

-- Apagar o modelo da biblioteca não apaga o token: ele fica na mesa, com uma caixa no lugar do
-- modelo, como as peças do mapa cujo modelo sumiu.
alter table public.tokens
  add column model_asset_id uuid references public.map_assets (id) on delete set null;
create index tokens_model_asset_idx on public.tokens (model_asset_id);

alter table public.tokens drop constraint tokens_visual;
alter table public.tokens add constraint tokens_visual check (
  (kind = 'image' and image_path is not null)
  or (kind = 'model' and model_key is not null)
  or kind = 'asset'
);

-- A coluna nova não entra no grant de update: o modelo do token é escolhido só na criação.

-- Na criação, o token de modelo precisa apontar para um modelo do dono da mesa (ou do dono do
-- mapa, na biblioteca): sem isso, um mestre usaria o modelo de outra pessoa, que os jogadores
-- dele nem conseguiriam ler.
create or replace function public.check_token_asset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'asset' then
    if new.model_asset_id is not null then
      raise exception 'Só o token de modelo enviado aponta para um modelo.' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.model_asset_id is null then
    raise exception 'Escolha o modelo do token.' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.maps m
    left join public.rooms r on r.id = m.room_id
    join public.map_assets a on a.id = new.model_asset_id
    where m.id = new.map_id and a.owner_id = coalesce(r.owner_id, m.owner_id)
  ) then
    raise exception 'O modelo do token precisa ser do mestre da mesa.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger tokens_asset_owner before insert on public.tokens
  for each row execute function public.check_token_asset();
